module.exports = {
  apps: [
    {
      name: "newsdetection-client",
      script: "npm",
      args: "start",
      cwd: "/var/www/newsdetection/client",
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      watch: true,
      ignore_watch: ["node_modules", "build", ".git"],
      watch_delay: 1000
    }
  ]
};
