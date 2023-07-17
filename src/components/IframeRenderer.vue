<script setup lang="ts">
import { ref, reactive, watch } from "vue"

const props = defineProps<{
  defaultUrl: string
  defaultWidth: string
  defaultHeight: string
  defaultOtherAttributes: Record<string, string>
  autoReload: boolean
}>()
let url = ref(props.defaultUrl)
let width = ref(props.defaultWidth)
let height = ref(props.defaultHeight)
let otherAttributes = reactive(props.defaultOtherAttributes)
let autoReload = ref(props.autoReload)
let iframekey = ref(1)

const updateURL = () => {
  const params = new URLSearchParams()
  if (autoReload.value) params.set("autoReload", "1")
  params.set("url", url.value)
  params.set("width", width.value)
  params.set("height", height.value)
  params.set("otherAttributes", JSON.stringify(otherAttributes))
  const domain = new URL(window.location.href).origin
  window.history.replaceState({}, `Iframe tester: ${domain}`, `${window.location.pathname}?${params}`)
}

watch(url, updateURL)
watch(width, updateURL)
watch(height, updateURL)
watch(otherAttributes, updateURL)
watch(autoReload, updateURL)

const iframeAttributes = ["frameborder", "allow", "csp", "importance", "loading", "name", "referrerpolicy", "sandbox", "srcdoc"]

let timer: number | null = null
if (autoReload && !timer) {
  timer = setInterval(() => {
    iframekey.value++
  }, 5000)
} else if (timer) {
  clearInterval(timer)
  timer = null
}
</script>

<template>
  <div>
    <label for="checkbox">Auto-reload every 5s</label>
    <input type="checkbox" id="checkbox" v-model="autoReload" />
  </div>

  <input id="url" v-model="url" placeholder="URL here" />
  <iframe :key="iframekey" :width="width" :height="height" :src="url" v-bind="otherAttributes"></iframe>

  <div>
    <p>Size:</p>
    <input v-model="width" placeholder="640px" />
    by
    <input v-model="height" placeholder="480px" />
  </div>

  <div class="row">
    <div style="flex: 1; padding:10px;">
      <h3>Iframe custom Attributes:</h3>

      <div class="row">
        <ul>
          <li v-for="value in iframeAttributes">
            <p>
              <code>
                <a :href="`https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#${value}`">{{ value }}</a></code
              >
            </p>
            <input v-model="otherAttributes[value]" placeholder="" />
          </li>
        </ul>
      </div>
    </div>

    <div style="flex: 1;padding:10px;">
      <h3>Code:</h3>

      <pre>
        <code>
    &lt;iframe
    width="{{width}}"
    height="{{height}}"
    src="{{url}}"
    {{Object.entries(otherAttributes).map(([key, value]) => `${key}="${value}"`).join(" ")}}
    &gt;&lt;/iframe&gt;
        </code>
      </pre>
    </div>
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

input[type="checkbox"] {
  margin: 0 8px;
}

div.row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
</style>
