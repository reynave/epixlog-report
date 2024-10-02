# EPIXLOG Report

Selamat datang di proyek EPIXLOG Report. Berikut adalah langkah-langkah untuk menginstal dan menjalankan aplikasi ini.
setting server IP di **.env** (sudah di setting sesuai server)
## Prerequisites

1. **Install Node.js v20.x atau lebih**  
   [Download Node.js](https://nodejs.org/en)

2. **Install GitHub Command Line**  
   [Download GitHub CLI](https://cli.github.com/)

## Instalasi
Masuk folder project anda untuk seterusnya 
Buka Command Line(cmd) di windows 

1. **Clone repositori**  
   Jalankan perintah berikut di folder proyek Anda:
   ```bash
   git clone https://github.com/reynave/epixlog-report.git

2. ```bash 
   npm install

3. ```bash 
   npm i nodemon

## Run Server and App

```
nodemon index.js
```
atau 
```
node index.js
```

jika ingin run selalu di dalam background bisa dengan **PM2**


Setelah berhasil jalankan http://localhost:3000/ 
(setting port ada di **.env**)

## Update patch version (jika ada)
```
git pull
```