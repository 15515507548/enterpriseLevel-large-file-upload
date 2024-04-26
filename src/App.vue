<template>
  <div id="app">
    <div class="app-main">
      <div class="container">
        <router-view />
      </div>
    </div>

    <!-- 将上传组件全局注册 -->
    <global-uploader />
  </div>
</template>

<script>
// import GlobalUploader from '/vue-simple-uploader/GlobalUploader'

export default {
  name: 'app',
  components: {
    // GlobalUploader
  },
  data() {
    return {
      activeRoute: ''
    }
  },
  watch: {
    '$route.path': {
      handler(path) {
        this.activeRoute = path
      },
      immediate: false
    }
  }
}
</script>

<style lang="scss">
#app {
  display: flex;
  flex-direction: column;

  .app-nav {
    background-color: #fff;

    .app-nav-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 1140px;
      margin: 0 auto;
    }

    .app-nav-title {
      color: #1989fa;
      font-weight: 600;
    }
  }

  .app-main {
    flex: 1;

    > .container {
      height: 100%;
    }
  }
}
</style>
