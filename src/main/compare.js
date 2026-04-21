export function compareToBaseline(currentFiles, baselineFiles) {
  const baselineMap = new Map(baselineFiles.map((f) => [f.file_path, f.hash]))
  const currentMap = new Map(currentFiles.map((f) => [f.filePath, f.hash]))

  const results = []

  for (const [filePath, hash] of currentMap) {
    if (!baselineMap.has(filePath)) {
      results.push({ filePath, status: 'ADDED', oldHash: null, newHash: hash })
    } else if (baselineMap.get(filePath) !== hash) {
      results.push({ filePath, status: 'MODIFIED', oldHash: baselineMap.get(filePath), newHash: hash })
    } else {
      results.push({ filePath, status: 'OK', oldHash: hash, newHash: hash })
    }
  }

  for (const [filePath, hash] of baselineMap) {
    if (!currentMap.has(filePath)) {
      results.push({ filePath, status: 'DELETED', oldHash: hash, newHash: null })
    }
  }

  return results
}
