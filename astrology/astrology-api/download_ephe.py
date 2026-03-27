import os
import urllib.request

ephe_dir = os.path.join(os.path.dirname(__file__), 'ephe')
os.makedirs(ephe_dir, exist_ok=True)

files_to_download = [
    'semo_18.se1',
    'sepl_18.se1',
    'seas_18.se1'
]

base_url = 'https://www.astro.com/ftp/swisseph/ephe/'

for f in files_to_download:
    url = base_url + f
    dest = os.path.join(ephe_dir, f)
    if not os.path.exists(dest):
        print('Downloading ' + f)
        try:
            urllib.request.urlretrieve(url, dest)
            print('Successfully downloaded ' + f)
        except Exception as e:
            print('Failed to download ' + f + ': ' + str(e))
    else:
        print(f + ' already exists.')
print('Ephemeris files ready.')
