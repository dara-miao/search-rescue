import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const assets = [
  {
    path: join(root, 'public/textures/usc-sat-dusk.jpg'),
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-118.2884,34.0186,-118.2814,34.0234&bboxSR=4326&imageSR=4326&size=1536,1264&format=jpg&f=image',
  },
  {
    path: join(root, 'public/doheny-times-mirror.jpg'),
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Doheny_Library_interior.jpg/1280px-Doheny_Library_interior.jpg',
  },
]

const headers = {
  'User-Agent': 'SearchRescue/1.0 (https://github.com/dara-miao/search-rescue)',
}

for (const asset of assets) {
  try {
    await access(asset.path)
    continue
  } catch {
    // fetch licensed/attributed sources only when the committed file is missing
  }
  await mkdir(dirname(asset.path), { recursive: true })
  const res = await fetch(asset.url, { headers })
  if (!res.ok) throw new Error(`Failed to fetch ${asset.url}: ${res.status}`)
  await writeFile(asset.path, Buffer.from(await res.arrayBuffer()))
}
