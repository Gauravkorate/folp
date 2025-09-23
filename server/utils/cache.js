// utils/cache.js
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // 10 min TTL
export default cache;
