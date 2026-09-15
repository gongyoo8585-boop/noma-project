name: Deploy Massage Platform

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          port: ${{ secrets.PORT }}
          script: |
            cd ${{ secrets.PROJECT_PATH }}

            git pull origin main

            npm install

            cd client
            npm install
            npm run build
            cd ..

            pm2 restart nora-api || pm2 start ecosystem.config.js --only nora-api

            pm2 save

            sudo systemctl reload nginx

      - name: Health Check
        run: |
          curl -fsSI https://api.nora365.co.kr
          curl -fsSI https://www.nora365.co.kr