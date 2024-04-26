
import SparkMD5 from 'spark-md5'
self.onmessage = e => {
  const file=e.data
  let fileReader = new FileReader()
  fileReader.readAsArrayBuffer(file)
  fileReader.onload = (ev) => {
    let buffer = ev.target.result
    const spark = new SparkMD5.ArrayBuffer();
    spark.append(buffer)
    let HASH = spark.end()
    let index = file.name.lastIndexOf('.')
    let suffix = file.name.slice(index)
    self.postMessage({
      buffer,
      HASH,
      suffix,
      filename: `${HASH}${suffix}`
    })
    self.close()
  }
}
