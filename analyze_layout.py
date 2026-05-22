from PIL import Image
import numpy as np

img = Image.open('public/ui/image.png')
pixels = np.array(img)
h, w = pixels.shape[:2]

print(f'Image size: {w}x{h}')

# Detect dark text regions (text is usually dark)
# Threshold: pixels with average brightness < 80
dark_mask = np.mean(pixels[:,:,:3], axis=2) < 60
print(f'\nDark pixels (likely text): {np.sum(dark_mask)} ({100*np.sum(dark_mask)/(w*h):.1f}%)')

# Find bounding boxes of dark regions
# Scan row by row to find text lines
text_rows = []
for y in range(h):
    row_dark = np.sum(dark_mask[y, :])
    if row_dark > 20:  # More than 20 dark pixels in row
        text_rows.append(y)

if text_rows:
    print(f'\nText detected in rows: {min(text_rows)} to {max(text_rows)}')
    
    # Group text rows into blocks
    blocks = []
    if text_rows:
        current_block = [text_rows[0]]
        for i in range(1, len(text_rows)):
            if text_rows[i] - text_rows[i-1] < 15:  # Same block
                current_block.append(text_rows[i])
            else:
                blocks.append((current_block[0], current_block[-1]))
                current_block = [text_rows[i]]
        blocks.append((current_block[0], current_block[-1]))
    
    print(f'\nText blocks (y-ranges):')
    for i, (start, end) in enumerate(blocks):
        print(f'  Block {i+1}: rows {start}-{end} (height: {end-start+1})')

# Detect colored elements (buttons, accents)
# Look for pixels that are significantly different from background
bg_color = np.array([240, 240, 240])  # Approximate background
diff = np.abs(pixels[:,:,:3].astype(float) - bg_color)
colored_mask = np.any(diff > 40, axis=2)
print(f'\nColored pixels (accents/buttons): {np.sum(colored_mask)} ({100*np.sum(colored_mask)/(w*h):.1f}%)')

# Find where the main graphic/image is
# Look for regions with high color variation
print('\nAnalyzing layout structure...')

# Divide image into grid and analyze each cell
grid_h, grid_w = 10, 10
cell_h, cell_w = h // grid_h, w // grid_w

print(f'\nGrid analysis ({grid_w}x{grid_h} cells):')
for gy in range(grid_h):
    row_info = []
    for gx in range(grid_w):
        y1, y2 = gy * cell_h, (gy + 1) * cell_h
        x1, x2 = gx * cell_w, (gx + 1) * cell_w
        cell = pixels[y1:y2, x1:x2, :3]
        
        # Calculate metrics
        avg_brightness = np.mean(cell)
        color_var = np.std(cell)
        dark_ratio = np.sum(np.mean(cell, axis=2) < 60) / cell.size
        
        if dark_ratio > 0.05:
            row_info.append(f'[{gy},{gx}]: text({dark_ratio:.0%})')
        elif color_var > 50:
            row_info.append(f'[{gy},{gx}]: graphic')
        elif avg_brightness > 230:
            row_info.append(f'[{gy},{gx}]: light')
        else:
            row_info.append(f'[{gy},{gx}]: mid')
    
    print(f'  Row {gy}: {" | ".join(row_info)}')

# Detect if there's a central image/graphic
center_y1, center_y2 = h//4, 3*h//4
center_x1, center_x2 = w//4, 3*w//4
center_region = pixels[center_y1:center_y2, center_x1:center_x2]
center_var = np.std(center_region)
print(f'\nCenter region variance: {center_var:.1f} (high = has graphic/image)')

# Check corners for UI elements
corners = {
    'top-left': pixels[0:50, 0:150],
    'top-right': pixels[0:50, w-150:w],
    'bottom-left': pixels[h-100:h, 0:200],
    'bottom-right': pixels[h-100:h, w-200:w],
}

print('\nCorner analysis:')
for name, corner in corners.items():
    avg = np.mean(corner[:,:,:3])
    print(f'  {name}: brightness={avg:.0f}')
