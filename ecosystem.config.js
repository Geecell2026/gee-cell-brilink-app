module.exports = {
  apps: [
    {
      name: "gee-cell-brilink-app",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
