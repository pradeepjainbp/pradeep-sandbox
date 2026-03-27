import os, urllib.request, time
urls = {
    'Jupiter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/600px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg',
    'Venus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/600px-Venus-real_color.jpg',
    'Saturn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/600px-Saturn_during_Equinox.jpg',
    'Rahu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Solar_eclipse_1999_4.jpg/600px-Solar_eclipse_1999_4.jpg', 
    'Ketu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Blood_moon_%284451000632%29.jpg/600px-Blood_moon_%284451000632%29.jpg'  
}

for p, url in urls.items():
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 JyotishScript-Retry'})
    try:
        time.sleep(2.5)
        with urllib.request.urlopen(req) as resp, open(f'astrology/assets/planets/{p}.jpg', 'wb') as out:
            out.write(resp.read())
            print(f"Downloaded {p}")
    except Exception as e:
        print(f"Failed {p}: {e}")
