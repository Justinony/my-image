from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import os
import uuid
import urllib.parse

# Set rembg model download path to a local directory to avoid permission errors
os.environ["U2NET_HOME"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".u2net")

from rembg import remove

app = FastAPI(title="Image Processing API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_images"
os.makedirs(TEMP_DIR, exist_ok=True)

from typing import Optional
import urllib.request
import ssl
import base64
from collections import OrderedDict
from fastapi import Request
from fastapi.responses import Response

# 1x1 transparent PNG (avoids browser ORB errors if upstream fetch fails)
_TRANSPARENT_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5n0i8AAAAASUVORK5CYII="
)

# Simple in-memory cache to reduce repeated upstream calls (previews trigger many requests).
_AVATAR_CACHE: "OrderedDict[str, tuple[bytes, str]]" = OrderedDict()
_AVATAR_CACHE_MAX = 512

@app.get("/api/avatar")
async def get_avatar(request: Request):
    try:
        # Reconstruct the query string
        query_params = request.url.query
        # Use an avatar style with clearly different hair/clothing/accessories.
        # Use v9.x since the option names/values match the official docs.
        target_url = "https://api.dicebear.com/9.x/avataaars/png"
        if query_params:
            target_url += f"?{query_params}"
            

        cached = _AVATAR_CACHE.get(target_url)
        if cached is not None:
            image_data, content_type = cached
            # refresh LRU
            _AVATAR_CACHE.move_to_end(target_url)
            return Response(
                content=image_data,
                media_type=content_type,
                headers={
                    "Cross-Origin-Resource-Policy": "cross-origin",
                    "Cache-Control": "no-store",
                },
            )
        req = urllib.request.Request(
            target_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        # NOTE: Some dev environments have a self-signed corporate proxy cert which breaks TLS verification.
        # For local development we allow an unverified SSL context to ensure avatar fetch works.
        ssl_ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=ssl_ctx) as response:
            image_data = response.read()
            content_type = response.headers.get('Content-Type', 'image/png')
            

        _AVATAR_CACHE[target_url] = (image_data, content_type)
        if len(_AVATAR_CACHE) > _AVATAR_CACHE_MAX:
            _AVATAR_CACHE.popitem(last=False)
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                # Helps browsers allow embedding across origins if needed
                "Cross-Origin-Resource-Policy": "cross-origin",
                "Cache-Control": "no-store",
            },
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Never return JSON here; browser expects an image and ORB will complain.
        return Response(
            content=_TRANSPARENT_PNG,
            media_type="image/png",
            headers={
                "Cross-Origin-Resource-Policy": "cross-origin",
                "Cache-Control": "no-store",
                "X-Avatar-Error": str(e)[:200],
            },
        )

@app.post("/api/process-image")
async def process_image(
    file: UploadFile = File(...),
    format: str = Form("jpeg"),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    scale: Optional[float] = Form(None),
    quality: int = Form(85),
    target_size_kb: Optional[int] = Form(None),
    target_size_mode: str = Form("max"), # "max" (compress < target), "min" (pad > target), "exact" (compress and pad to target)
    bg_color: Optional[str] = Form(None)
):
    try:
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # If background color is specified, remove background and apply new color
        if bg_color:
            # remove background
            image = remove(image)
            
            # create a new image with the specified background color
            background = Image.new('RGBA', image.size, bg_color)
            
            # paste the image with removed background onto the new background
            background.paste(image, mask=image)
            image = background
            
        # Convert format if needed (e.g., RGBA to RGB for JPEG)
        if format.lower() in ['jpeg', 'jpg'] and image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
            
        # Calculate new dimensions
        new_width = image.width
        new_height = image.height
        
        if scale:
            new_width = int(image.width * scale)
            new_height = int(image.height * scale)
        else:
            if width:
                new_width = width
            if height:
                new_height = height
                
        # Resize if dimensions changed
        if new_width != image.width or new_height != image.height:
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        # Generate output filename
        original_filename = os.path.splitext(file.filename)[0]
        output_filename = f"{original_filename}_processed.{format.lower()}"
        encoded_filename = urllib.parse.quote(output_filename)
        output_format = format.upper() if format.lower() != 'jpg' else 'JPEG'
        
        output_io = io.BytesIO()
        
        if target_size_kb:
            target_bytes = target_size_kb * 1024
            
            if target_size_mode in ["max", "exact"] and output_format in ['JPEG', 'WEBP']:
                # Binary search for quality
                low, high = 1, quality
                best_quality = quality
                
                # First check max quality
                temp_io = io.BytesIO()
                image.save(temp_io, format=output_format, quality=high)
                
                if temp_io.tell() > target_bytes:
                    while low <= high:
                        mid = (low + high) // 2
                        temp_io = io.BytesIO()
                        image.save(temp_io, format=output_format, quality=mid)
                        if temp_io.tell() <= target_bytes:
                            best_quality = mid
                            low = mid + 1
                        else:
                            high = mid - 1
                
                image.save(output_io, format=output_format, quality=best_quality)
            else:
                # For min mode or formats that don't support quality, just save
                save_params = {'format': output_format}
                if output_format in ['JPEG', 'WEBP']:
                    # If min mode, try to use max quality to increase size naturally before padding
                    save_params['quality'] = 100 if target_size_mode == "min" else quality
                image.save(output_io, **save_params)
                
            current_bytes = output_io.tell()
            if target_size_mode in ["min", "exact"] and current_bytes < target_bytes:
                padding_size = target_bytes - current_bytes
                output_io.write(b'\x00' * padding_size)
        else:
            save_params = {'format': output_format}
            if output_format in ['JPEG', 'WEBP']:
                save_params['quality'] = quality
            image.save(output_io, **save_params)
            
        output_io.seek(0)
        
        return StreamingResponse(
            output_io, 
            media_type=f"image/{format.lower()}",
            headers={"Content-Disposition": f"attachment; filename*=utf-8''{encoded_filename}"}
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
