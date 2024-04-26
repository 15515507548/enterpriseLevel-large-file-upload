<template>
  <div class="page page-about">
    <el-upload
      class="upload-demo"
      drag
      multiple
      action=""
      :http-request="httpRequest"
      :show-file-list="false"
      accept=".zip,.png,.rar,.jpg,.pdf"
    >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">
        将文件拖到此处，或
        <em>点击上传</em>
      </div>
      <div class="el-upload__tip" slot="tip">
        上传文件只能是zip,png,rar,jpg,pdf格式，最多上传3个文件
      </div>
    </el-upload>
    <div style="width: 50%; margin-top: 20px">
      <div
        v-for="(file, index) in fileList"
        :key="index"
        style="margin-top: 10px"
        @click="handleLook(file)"
      >
        <div class="hoverRow">
          <div>
            <i class="el-icon-document" style="margin-right: 7px"></i>
            <span class="colorHover">{{ file.file.name }}</span>
          </div>
          <div>
            <span style="color: red" v-show="!file.hash"
              >计算文件hash<i class="el-icon-loading"></i
            ></span>
            <i
              v-show="file.isShow && file.hash && file.isBigFile"
              :class="file.iconClass"
              @click.stop="handlePausePlay(file)"
              style="margin-left: 10px"
            ></i>
            <i
              class="el-icon-close"
              @click.stop="hanDelete(file, file.file.name, index)"
              style="margin-left: 10px"
            ></i>
          </div>
        </div>
        <el-progress v-show="file.isShow" :percentage="file.percentage"></el-progress>
      </div>
    </div>
  </div>
</template>

<script>
import { instance } from './request'
import SparkMD5 from 'spark-md5'
import axios from 'axios'
export default {
  name: 'myAbout',
  data() {
    return {
      fileList: [],
      beforefileListUpload: []
    }
  },
  methods: {
    //获取唯一标识
    onlyVal() {
      let ran = Math.random() * new Date()
      return ran.toString(16).replace('.', '')
    },
    handleLook(file) {
      if (file.isShow) {
        this.$message.warning('当前文件正在上传中，请上传结束之后再试')
      } else {
        window.open(file.url)
      }
    },
    hanDelete(file, name, index) {
      this.$confirm(`确定移除 ${name}？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          if (Array.isArray(file.cancel)) {
            file.cancel.forEach((fn) => {
              fn && fn()
            })
            file.terminateRequest = true
          } else {
            file.cancel && file.cancel()
          }
          this.fileList.splice(index, 1)
        })
        .catch(() => {})
    },
    async handlePausePlay(file) {
      if (file.iconClass == 'el-icon-video-pause') {
        file.iconClass = 'el-icon-video-play'
        if (Array.isArray(file.cancel)) {
          file.cancel.forEach((fn) => {
            fn && fn()
          })
          file.terminateRequest = true
        }
        console.log(file.already, file.chunks, file.loadSize, 123000)
      } else {
        file.terminateRequest = false
        file.iconClass = 'el-icon-video-pause'
        await this.uploadAlready(file)
        console.log(file.already, file.chunks, file.loadSize, 5209999990000)
        file.already.forEach((filename) => {
          file.chunks = file.chunks.filter((chunk) => chunk.filename != filename)
        })
        this.chunkUpload(file)
      }
    },
    // changeBuffer(file) {
    //   return new Promise((resolve) => {
    //     let fileReader = new FileReader()
    //     fileReader.readAsArrayBuffer(file)
    //     fileReader.onload = (ev) => {
    //       let buffer = ev.target.result
    //       let spark = new SparkMD5.ArrayBuffer()
    //       spark.append(buffer)
    //       let HASH = spark.end()
    //       let index = file.name.lastIndexOf('.')
    //       let suffix = file.name.slice(index)
    //       resolve({
    //         buffer,
    //         HASH,
    //         suffix,
    //         filename: `${HASH}${suffix}`
    //       })
    //     }
    //   })
    // },
    // worker的使用(https://zhuanlan.zhihu.com/p/467714393，在public中使用，https://blog.csdn.net/weixin_42063951/article/details/125300644在src文件夹中使用)
    changeBuffer(file) {
      return new Promise((resolve) => {
        const worker = new Worker(new URL('./worker.js', import.meta.url), {
          type: 'module'
        })
        // const worker = new Worker('/worker.js')
        worker.postMessage(file)
        worker.onmessage = (e) => {
          resolve(e.data)
        }
      })
    },
    async complate(file, chunk) {
      // 管控进度条
      file.loadSize += chunk.file.size
      const percentage = +((file.loadSize / file.file.size) * 100).toFixed(0)
      file.percentage = percentage
      // 当所有切片都上传成功，我们合并切片
      console.log(percentage, 5000)
      if (file.loadSize < file.file.size) return
      //file.percentage = 100
      try {
        let res = await instance.post(
          '/upload_merge',
          {
            HASH: file.hash,
            count: file.chunks.length
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
        if (+res.code === 0) {
          this.$message({
            message: `恭喜您，文件上传成功，您可以基于 ${res.servicePath} 访问该文件~~`,
            type: 'success'
          })
          file.url = res.servicePath
          return
        }
        throw '切片合并失败，请您稍后再试~~'
      } catch (err) {
        //上传失败删除文件
        this.fileList = this.fileList.filter((v) => v !== file)
        this.$message.error('切片合并失败，请您稍后再试~~')
      } finally {
        file.isShow = false
        file.percentage = 0
        file.cancel = []
      }
    },
    async uploadAlready(file) {
      // 判断该文件是否上传，shouldUpload为false则表示该文件已经上传，shouldUpload为true并且fileList为空数组表示没有上传，fileList有值表示已经部分上传的切片名字集合
      file.already = []
      try {
        let res = await instance.get('/upload_already', {
          params: {
            HASH: file.hash,
            suffix: file.suffix
          }
        })
        if (+res.code === 0) {
          file.already = res.fileList || []
          file.shouldUpload = res.shouldUpload
          return
        }
        throw '接口出错'
      } catch (err) {
        file.already = []
        file.shouldUpload = undefined
      }
    },

    async chunkUpload(file) {
      for (const chunk of file.chunks) {
        //上传过程中删除文件或离开页面后在重新上传文件需要传already，暂停后回复上传不需要传already
        if (file.iconClass == 'el-icon-video-pause') {
          if (file.already.includes(chunk.filename)) {
            this.complate(file, chunk)
            continue
          }
        }
        let fm = new FormData()
        fm.append('file', chunk.file)
        fm.append('filename', chunk.filename)
        const fn = () =>
          instance.post('/upload_chunk', fm, {
            cancelToken: new axios.CancelToken(function (c) {
              file.cancel.push(c)
            })
          })
        //接口失败重试每个接口总共可以重试4次
        const sgfd = (fn, index = 0, max = 4) => {
          if (file.terminateRequest) {
            return
          }
          if (index < max) {
            const promise = fn()
            file.lists.add(promise)
            promise
              .then((res) => {
                if (+res.code === 0) {
                  file.lists.delete(promise)
                  this.complate(file, chunk)
                  return
                }
                throw '当前切片上传失败，请您稍后再试~~'
              })
              .catch((err) => {
                file.lists.delete(promise)
                index++
                sgfd(fn, index)
              })
          }
        }
        async function FSG() {
          if (file.lists.size >= 3) {
            // 6代表请求控制最大并发数
            try {
              await Promise.race(file.lists)
            } catch (err) {
              await FSG()
            }
          }
        }
        if (file.terminateRequest) {
          break
        }
        sgfd(fn)
        await FSG()
      }
      await Promise.allSettled(file.lists)
      if (file.iconClass == 'el-icon-video-pause') {
        if (file.loadSize !== file.file.size) {
          this.fileList = this.fileList.filter((v) => v !== file)
          this.$message.error('切片上传失败，请您稍后再试~~')
        }
      }
    },
    async httpRequest(file) {
      const idx = file.file.name.lastIndexOf('.')
      const iszip = file.file.name.slice(idx)
      // const isLt2M = file.file.size / 1024 / 1024 <= 10
      if (!['.zip', '.png', '.rar', '.jpg', '.pdf'].includes(iszip)) {
        return this.$message.warning(`上传文件只能是zip,png,rar,jpg,pdf格式`)
      }
      if (this.fileList.length >= 3) {
        return this.$message.warning(`当前最多上传3个文件`)
      }
      //是否显示进度条
      file.isShow = true
      //进度条百分比的值
      file.percentage = 0
      //是否终止请求
      file.terminateRequest = false
      //暂停或回复按钮
      file.iconClass = 'el-icon-video-pause'
      this.fileList.push(file)
      let { HASH, suffix } = await this.changeBuffer(file.file)
      file.hash = HASH
      file.suffix = suffix
      file.isBigFile = file.file.size > 5 * 1024 * 1024
      if (file.isBigFile) {
        await this.uploadAlready(file)
        if (file.shouldUpload == false) {
          //秒传
          this.fileList = this.fileList.filter((v) => v !== file)
          return this.$message.warning(`当前文件已经上传过了,请上传其他文件`)
        } else if (file.shouldUpload == undefined) {
          this.fileList = this.fileList.filter((v) => v !== file)
          return this.$message.warning(`接口错误`)
        }
        //把当前文件分成一个个chunk切片
        let chunkSize = 5 * 1024 * 1024 //切片大小
        file.loadSize = 0 //每个切片的起始下标
        file.chunks = []
        while (file.loadSize < file.file.size) {
          file.chunks.push({
            file: file.file.slice(file.loadSize, file.loadSize + chunkSize),
            filename: `${HASH}_${file.chunks.length + 1}${suffix}`
          })
          file.loadSize += chunkSize
        }
        // 取消ajax的数组集合
        file.cancel = []
        //用于下面计算滚动条所以需要重置为0
        file.loadSize = 0
        //收集切片的请求
        file.lists = new Set()
        this.chunkUpload(file)
      } else {
        file.cancel = null
        let formData = new FormData()
        formData.append('file', file.file)
        formData.append('filename', `${HASH}${suffix}`)
        instance
          .post('/upload_single', formData, {
            onUploadProgress: (e) => {
              const percentage = +((e.loaded / e.total) * 100).toFixed(0)
              file.percentage = percentage
            },
            cancelToken: new axios.CancelToken(function (c) {
              file.cancel = c
            })
          })
          .then((res) => {
            if (+res.code === 0) {
              this.$message({
                message: `恭喜您，文件上传成功，您可以基于 ${res.servicePath} 访问该文件~~`,
                type: 'success'
              })
              file.url = res.servicePath
              return
            }
            throw '当前文件上传失败，请您稍后再试~~'
          })
          .catch((err) => {
            //上传失败删除文件
            this.fileList = this.fileList.filter((v) => v !== file)
            this.$message.error('当前文件上传失败，请您稍后再试~~')
          })
          .finally(() => {
            file.isShow = false
            file.percentage = 0
            file.cancel = null
          })
      }
    }
  }
}
</script>

<style scoped lang="scss">
.hoverRow {
  display: flex;
  justify-content: space-between;
  margin-right: 50px;
  padding: 3px 5px;
  align-items: center;
}
.hoverRow:hover {
  background: #ebeef5;
  cursor: pointer;
  .colorHover {
    color: #409eff;
  }
}
</style>
