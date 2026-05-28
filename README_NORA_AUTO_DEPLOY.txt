NORA AUTO DEPLOY FINAL SETUP

1. 서버 파일 위치
/home/ubuntu/noma-project/deploy/deploy.sh

2. GitHub Actions 파일 위치
.github/workflows/nora-auto-deploy.yml

3. GitHub Secrets 필수 등록
NORA_EC2_HOST=15.164.100.55
NORA_EC2_USER=ubuntu
NORA_EC2_PORT=22
NORA_EC2_SSH_KEY=EC2 접속용 private key 전체 내용

4. 로컬 작업 순서
cd ~/noma-project
npm install
cd client
npm install
npm run dev

확인:
http://localhost:5173
http://localhost:5173/admin
http://localhost:5173/admin/dashboard

5. 배포 실행
cd ~/noma-project
git add .
git commit -m "NORA UPDATE"
git push origin main

6. 자동 실행 흐름
git push origin main
-> GitHub Actions
-> SSH EC2 접속
-> /home/ubuntu/noma-project/deploy/deploy.sh
-> git pull
-> npm install
-> client build
-> PM2 reload
-> nginx reload
-> nora365.co.kr 반영

7. 운영 확인 주소
https://nora365.co.kr
https://nora365.co.kr/admin
https://nora365.co.kr/admin/dashboard
https://api.nora365.co.kr/api/
https://cdn.nora365.co.kr
https://m.nora365.co.kr
