const redis = require("redis");

const redisClient = redis.createClient({
    url: "redis://127.0.0.1:6379"
})

redisClient.on("connect", () => console.log("Redis client đang kết nối"));
redisClient.on("error", (err) => console.log("Lỗi kết nối Redis:", err));

redisClient.connect();

module.exports = redisClient;