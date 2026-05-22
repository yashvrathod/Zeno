from PIL import Image
import collections

img = Image.open('public/ui/image.png')
print(f'Size: {img.size}')
print(f'Mode: {img.mode}')

# Get dominant colors by sampling
pixels = list(img.getdata())
# Sample every 100th pixel to avoid too much data
sampled = pixels[::100]

# Count color frequencies (rounded to nearest 16)
def round_color(c):
    if len(c) == 4:
        return tuple((x // 16) * 16 for x in c[:3])
    return tuple((x // 16) * 16 for x in c)

color_counts = collections.Counter(round_color(p) for p in sampled)
print('\nTop 15 dominant colors:')
for color, count in color_counts.most_common(15):
    print(f'  RGB{color}: {count} occurrences')

# Analyze layout - check different regions
w, h = img.size
print(f'\nAnalyzing regions:')

# Top region (navbar area)
top_region = pixels[:w*100]
top_avg = (sum(p[0] for p in top_region)//len(top_region), 
           sum(p[1] for p in top_region)//len(top_region),
           sum(p[2] for p in top_region)//len(top_region))
print(f'  Top (navbar): RGB{top_avg}')

# Center region (hero area)
center_start = (h//2 - 100) * w
center_region = pixels[center_start:center_start + w*200]
center_avg = (sum(p[0] for p in center_region)//len(center_region),
              sum(p[1] for p in center_region)//len(center_region),
              sum(p[2] for p in center_region)//len(center_region))
print(f'  Center (hero): RGB{center_avg}')

# Check for dark vs light theme
is_dark = top_avg[0] < 128 and top_avg[1] < 128 and top_avg[2] < 128
print(f'\nTheme: {"DARK" if is_dark else "LIGHT"}')

# Check for grid pattern
print('\nChecking for grid/lines...')
# Sample horizontal line in middle
mid_y = h // 2
mid_line = pixels[mid_y * w:(mid_y + 1) * w]
# Look for repeating patterns
changes = sum(1 for i in range(1, len(mid_line)) if mid_line[i] != mid_line[i-1])
print(f'  Color changes in middle row: {changes} (out of {len(mid_line)})')
