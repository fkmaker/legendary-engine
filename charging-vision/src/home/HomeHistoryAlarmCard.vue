<template>
  <div class="history-alarm-card">
    <div class="history-alarm-title">历史报警记录</div>
    <div class="history-alarm-list">
      <div
        class="history-alarm-item"
        v-for="(item, idx) in alarmList"
        :key="item.id || idx"
      >
        <template v-if="typeof item === 'object' && item.time && item.msg">
          <span class="alarm-time">{{ item.time }}</span>
          <span class="alarm-msg">{{ item.msg }}</span>
        </template>
        <template v-else>
          <span class="alarm-msg">{{ item }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  alarmList: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.history-alarm-card {
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
.history-alarm-title {
  font-size: 18px;
  color: #4572d9;
  font-weight: bold;
  text-align: left;
  margin-bottom: 18px;
}
.history-alarm-list {
  width: 100%;
  max-height: 180px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.history-alarm-list::-webkit-scrollbar {
  display: none;
}
.history-alarm-item {
  display: flex;
  font-size: 15px;
  margin-bottom: 8px;
  color: #d4380d;
  background: transparent;
  border-radius: 6px;
  padding: 6px 8px;
  transition: background-color 0.25s, transform 0.25s, box-shadow 0.25s;
}
.history-alarm-item:hover {
  background: rgba(69, 114, 217, 0.08);
  box-shadow: 0 4px 12px -4px rgba(32, 74, 135, 0.22);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .history-alarm-item {
    transition: none;
  }
}
.alarm-time {
  min-width: 120px;
  color: #888;
  margin-right: 12px;
}
.alarm-msg {
  flex: 1;
}
</style>
