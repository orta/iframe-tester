<script setup lang="ts">
import type { ExtractPublicPropTypes } from 'vue';
import IframeRendererVue from './components/IframeRenderer.vue';

// type IframeRendererProps = ExtractPublicPropTypes<InstanceType<typeof IframeRendererVue>["$props"]>
const params = new URLSearchParams(document.location.search)
const props = {
  defaultUrl: params.get("url") || "https://www.youtube.com/embed/MBRqu0YOH14",
  defaultWidth: params.get("width") || "640px",
  defaultHeight: params.get("height") || "480px",
  defaultOtherAttributes: JSON.parse(params.get("otherAttributes") || "{}"),
  autoReload:!!params.get("autoReload"),
  showMessageEvents: !!params.get("showMessageEvents")
}

</script>

<template>
  <main>
    <h1>iframe tester</h1>
    <h3>Enter a URL to set as the iframe, all possible params are saved into the URL so you can refresh/share.</h3>

    <IframeRendererVue v-bind="props" />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

h3 {
  margin-bottom: 24px;
}

main {
  margin: 0 auto;
  display: flex;
  place-items: flex-start;
  flex-wrap: wrap;
  flex-direction: column;
}

</style>
