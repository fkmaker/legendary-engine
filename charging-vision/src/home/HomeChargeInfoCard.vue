<template>
  <div class="charge-info-card">
    <div class="charge-info-title">当前充电信息</div>
    <div class="charge-info-table">
      <div class="charge-info-header">
        <div class="charge-info-cell">序号</div>
        <div class="charge-info-cell">区域</div>
        <div class="charge-info-cell">小车品牌</div>
        <div class="charge-info-cell">小车编号</div>
        <div class="charge-info-cell">当前电量</div>
      </div>
      <div class="charge-info-row" v-for="item in chargeList" :key="item.id">
        <div class="charge-info-cell">{{ item.id }}</div>
        <div class="charge-info-cell">{{ item.area }}</div>
        <div class="charge-info-cell">{{ item.brand }}</div>
        <div class="charge-info-cell">{{ item.code }}</div>
        <div class="charge-info-cell">{{ item.power }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  chargeList: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.charge-info-card {
  background: #dfecfd;
  border-radius: 20px;
  border-top: rgb(177, 215, 251) 4px solid;
  border-bottom: rgb(197, 216, 231) 4px solid;
  border-left: rgb(177, 215, 251) 1px solid;
  border-right: rgb(197, 216, 231) 1px solid;
  box-shadow: 15px 15px 30px #d6e3ff, -15px -15px 30px #f7f8fd;
  padding: 24px 16px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.charge-info-title {
  font-size: 18px;
  color: #4572d9;
  font-weight: bold;
  text-align: left;
  margin-bottom: 18px;
}
.charge-info-table {
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  position: relative;
  padding-top: 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE 10+ */
}
.charge-info-table::-webkit-scrollbar { display: none; }
.charge-info-header,
.charge-info-row {
  display: flex;
  color: #738a9f;
  width: 100%;
}
.charge-info-header {
  font-weight: bold;
  background: #e9ecfc;
  border-radius: 6px;
  margin-bottom: 8px;
  position: sticky;
  top: 0;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
}
.charge-info-cell {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  font-size: 15px;
}
/* 交互增强 */
.charge-info-row {
  border-radius: 4px;
  transition: background-color .25s, transform .25s, box-shadow .25s;
}
.charge-info-row:hover {
  background: rgba(69,114,217,0.08);
  box-shadow: 0 4px 12px -4px rgba(32,74,135,.22);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .charge-info-row { transition: none; }
}
</style>
