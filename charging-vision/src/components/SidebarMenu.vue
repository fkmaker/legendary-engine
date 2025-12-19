<template>
  <n-collapse
    style="
      height: 98%;
      background: linear-gradient(
        90deg,
        rgba(195, 225, 253, 1) 0%,
        rgba(223, 236, 254, 1) 50%
      );
      padding-top: 10px;
      color: #8fa7be;
    "
    accordion
    v-model:expanded-names="expandedFactory"
  >
    <n-collapse-item
      v-for="factory in factoryStore.factories"
      :key="factory.ftid"
      :title="factory.ftnm"
      :name="factory.ftid"
      style="margin-bottom: 0; font-size: 16px; color: #8fa7be"
      @click="onFactoryExpand(factory.ftid)"
    >
      <div
        v-if="factoryStore.workshopsMap[factory.ftid]"
        style="max-height: 330px; overflow-y: auto; color: #8fa7be"
      >
        <n-menu
          :options="factoryStore.workshopsMap[factory.ftid]"
          mode="vertical"
          :collapsed-width="64"
          style="margin-bottom: 0; font-size: 16px"
          @update:value="(val) => handleSelect(factory, val)"
        />
      </div>
      <div v-else style="padding: 16px; color: #b0b0b0">
        点击展开加载数据...
      </div>
    </n-collapse-item>
  </n-collapse>
</template>

<script setup>
import { ref } from "vue";
import { NMenu, NCollapse, NCollapseItem } from "naive-ui";
import { useFactoryStore } from "../stores/factoryStore";
const emit = defineEmits(["select"]);

const factoryStore = useFactoryStore();
const expandedFactory = ref([]);

function onFactoryExpand(ftid) {
  factoryStore.fetchFactoryWorkshops(ftid);
}

function handleSelect(factory, amrKey) {
  let amrData = null;
  const groups = factoryStore.workshopsMap[factory.ftid] || [];
  for (const g of groups) {
    const found = g.children.find((c) => c.key === amrKey);
    if (found) {
      amrData = found.amrData;
      break;
    }
  }
  emit("select", { factory, amrKey, amrData });
}
</script>
