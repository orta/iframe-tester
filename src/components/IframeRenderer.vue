<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  defaultUrl: string
  defaultWidth: string
  defaultHeight: string
}>()
let url = ref(props.defaultUrl)
let width = ref(props.defaultWidth)
let height = ref(props.defaultHeight)
let otherAttributes = ref({} as Record<string, string>)

const updateURL = () => {
  const params = new URLSearchParams()
  params.set("url", url.value)
  params.set("width", width.value)
  params.set("height", height.value)
  params.set("otherAttributes", JSON.stringify(otherAttributes.value))
  const domain = new URL(window.location.href).origin
  window.history.replaceState({}, `Iframe tester: ${domain}` , `${window.location.pathname}?${params}`)
}

watch(url, updateURL)
watch(width, updateURL)
watch(height, updateURL)
watch(otherAttributes, updateURL)

const iframeAttributes = ["frameborder", "allow", "csp", "importance", "loading", "name", "referrerpolicy", "sandbox", "srcdoc"]

</script>

<template>
  <input id="url" v-model="url" placeholder="URL here" />
  <iframe :width="width" :height="height" :src="url" v-bind="otherAttributes"></iframe>

  <div>
    <p>Size:</p>
    <input v-model="width" placeholder="640px" />
    by
    <input v-model="height" placeholder="480px" />
  </div>

  <h3>Iframe custom Attributes:</h3>

  <div class="attributes">
    <ul>
      <li v-for="value in iframeAttributes">
        <p><code><a :href="`https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#${value}`">{{ value }}</a></code></p>
        <input v-model="otherAttributes[value]" placeholder="" />
      </li>
    </ul>

  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
  margin-top: 50px;
  margin-bottom: 0px;
}

iframe {
  margin-top: 12px;
  margin-bottom: 36px;
}

input#url {
  font-size: x-large;
  width: 100%;
}

div {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
</style>
