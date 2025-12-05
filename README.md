# NodeJS - Api.nethubtv.vn

#### ssh server 

    ssh IP Server : Port

#### Vào thư mục lưu trữ code

    cd /var/www/nodejs-api.nethubtv.vn

#### Check danh sách ứng dụng đang chạy 

    pm2 list

#### Update code

    git pull origin master

#### update NPM (nếu sửa file package json)

    npm install
    npm update

#### restart ứng dụng (chú ý tên ứng dụng trên pm2 list)

    pm2 restart ten_ung_dung
    
    example: tên ứng dụng là sb-api.nethubtv.vn
    
    pm2 start server.js --name sb-api.nethubtv.vn
    
    pm2 restart sb-api.nethubtv.vn

#### Dừng ứng dụng (chú ý tên ứng dụng trên pm2 list)

    pm2 stop ten_ung_dung
    
    example: tên ứng dụng là sb-api.nethubtv.vn
    
    pm2 stop sb-api.nethubtv.vn

#### Delete ứng dụng (chú ý tên ứng dụng trên pm2 list)

    pm2 delete ten_ung_dung
    
    example: tên ứng dụng là sb-api.nethubtv.vn
    
    pm2 delete sb-api.nethubtv.vn

#### Check logs

    pm2 logs

