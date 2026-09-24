module.exports = {
  apps: [{
    name: 'veritabox-api',
    cwd: './backend',
    script: 'src/index.js',
    node_args: '--experimental-modules',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/veritabox/error.log',
    out_file: '/var/log/veritabox/out.log',
    merge_logs: true,
    restart_delay: 5000,
    max_restarts: 10,
  }],
};
