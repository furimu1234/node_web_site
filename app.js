const { text } = require("express");
const express = require("express");
const session = require('cookie-session');
const bcrypt = require('bcrypt');
const { redirect, json, type } = require("express/lib/response");

const mysql = require('mysql2');
const fs = require('fs');
const { stringify } = require('csv-stringify/sync');
const Iconv = require('iconv-lite');
const e = require("express");


const port = process.env.PORT;

const app = express()


app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

//DB接続
const client = mysql.createConnection(process.env.MYSQL);

//認証情報とnodemailerオブジェクトの生成(個人情報のため割愛してもよい)
/*const porter = nodemailer.createTransport({
  service : "gmail",
  port : "465",
  secure : "true",
  auth :{
    //自分のアドレスとgmailのアプリパスワード
    user : '',//gmailadress
    pass : ""//gmailアプリのパス
  }
})*/

// test.pyを呼び出すモジュール

let obj;
let record,user_id,rate_data,rate_time,rate_date;

//DBと接続できなければerr
client.connect((err) => {
    if (err) {
      
      return;
    }
    
});

app.use(
  session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

//全てのルーティング時にログインか非ログインかを判断するミドルウェア
app.use((req,res,next)=>{
  

  client.query(
    'SELECT * FROM users WHERE email = ? and password = ?',
    [req.body.email, req.body.password],
    (error, results) => {
      if (results.length <= 0){
        res.locals.islogin = false;
      }
      else{
        
        res.locals.userId = req.session.userId
        res.locals.username = req.session.username
        res.locals.email = req.session.email
        res.locals.password = req.session.password
        res.locals.deviceid = req.session.deviceid
        res.locals.numlimit = req.session.numlimit
      }
    }
  )
  
  next();
});
app.set('views',__dirname+'/views');

//テンプレートエンジン’ejs’を使用する宣言
app.set("view engine", "ejs");

//トップページ表示
app.get('/',(req,res,error) => {
  
  res.render('index');
});



//ログインページ表示
app.get('/login',(req,res,error) => {
  
  res.render('login',{errors: [] });
});

//ログイン処理
app.post('/login', (req, res ,next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = [];
//空チェック機能
  if(email === ''){
    errors.push('メールアドレスが空です。');
  }
  if(password === ''){
    errors.push('パスワードが空です。');
  }
  if(errors.length > 0){
    console.error("login error")
    res.render('login.ejs',{errors : errors});
  }else{
    next();
  }
},
(req,res)=>{
  const email = req.body.email;
  client.query(
    'SELECT * FROM users WHERE email = ?',
    [email],
    (error, results) => {
      
      const errors = [];
      if(results.length > 0){

          req.session.email = results[0].email
          req.session.username = results[0].username
          req.session.deviceid = results[0].deviceid
          req.session.numlimit = results[0].numlimit
          // 
          req.session.password = results[0].password;
          
          res.redirect('/my');

      
      }else{
        //入力したemailと一致しなければエラー配列と共にログインページにレスポンスする
        errors.push('認証に失敗しました。');
        res.render('login',{errors:errors});  
      }
    }
  )
}
);


//ログインページからトップページに戻る
app.get('/return', (req, res) => {
    req.session.destroy((error) => {
      res.redirect('index');
    });
  });

//ユーザーページを表示
app.get('/my',(req,res)=>{
  
  res.render("my", {
    "userId": req.session.userId, 
    "username": req.session.username,
    "email": req.session.email,
    "password": req.session.password,
    "deviceid": req.session.deviceid,
    "numlimit": req.session.numlimit
  });
});

//新規登録ページを表示
app.get('/signup',(req,res) => {
    res.render("signup",{errors: [] });
});

//新規登録処理
app.post('/signup',(req,res,next)=>{

  const devicecode = req.body.devicecode
  client.query(
    'SELECT deviceid FROM partienttbl WHERE devicecode = ?',
    [devicecode],
    (err,results)=>{
      

      if(results.length > 0){
        const deviceid = results[0].deviceid
        const email = req.body.email;
        client.query(
          'SELECT * FROM users WHERE email = ? or deviceid = ?',
          [email,deviceid],
          (err,results)=>{
            if(results.length > 0){
              console.error('このユーザーは既に登録済みです。')
              res.render('signup',{errors : 'このユーザーは既に登録済みです。'})
            }else{
              const username = req.body.username;
              const password = req.body.password;
              bcrypt.hash(password,10,(error,hash)=>{
                client.query(
                  'INSERT INTO users (username,email,password,deviceid) VALUES(?,?,?,?)',
                  [username,email,hash,deviceid],
                  (error,results)=>{
                    //アカウント登録完了メールをユーザーに送る
                    porter.sendMail({
                      from : "dayoujianyuan091@gmail.com",
                      to : email,
                      subject : "医療情報",
                      text : `${username}さんのユーザー登録が完了しました。`
                    },(err,info)=>{
                      if(err){
                           
                           return
                      }
                      
                    })
                    // results[0].numlimit
                    req.session.userId = results.insertId;
                    req.session.username = username;
                    req.session.email = email;
                    req.session.password = password;
                    req.session.deviceid = deviceid;
                    req.session.numlimit = 100;
                    res.redirect('/my');
                  } 
                );
              });
            }
          }
        )
      }else{
        
        errors.push('ユーザーコードが間違っています。')
        res.render('signup',{errors : errors})
      }
    }
  ) 
});

//アカウント詳細ページを表示
app.get('/acount',(req,res) => {
  res.render('acount', {
    "userId": req.session.userId, 
    "username": req.session.username,
    "email": req.session.email,
    "password": req.session.password,
    "deviceid": req.session.deviceid,
    "numlimit": req.session.numlimit
  });
});

//アカウント変更ページを表示
app.get('/change', (req,res) => {
  res.render('change');
})

//アカウント変更処理
app.post('/update/:id',(req,res,next)=>{
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const deviceid = req.body.deviceid;
  const numlimit = req.body.numlimit;
  // 
  const userId = req.params.id;
  //パスワードのハッシュ化
  bcrypt.hash(password,10,(error,hash)=>{
    client.query(
      'UPDATE users SET username = ?, email = ?, password = ?,deviceid = ?,numlimit = ? WHERE id = ?',
      [username,email,hash,deviceid,numlimit,userId],
      (error,results)=>{
        
        
          req.session.userId = userId;
          req.session.email = email;
          req.session.username = username;
          req.session.password = password;
          req.session.numlimit = numlimit;
        res.redirect('/my');
      } 
    );
  });
});

//アカウント削除処理
app.post('/delete/:id',(req,res,next) =>{
  
  client.query(
    'DELETE FROM users WHERE id = ?',
    [req.params.id],
    (error,results)=>{
      res.redirect('/');
    }
  )
})



  
//データをグラフで表示
app.get('/data/:deviceid',(req,res,next)=>{
  const deviceid = req.params.deviceid;
  
  let numlimit ;

  let data;
  client.query(
    `SELECT * FROM datatbl WHERE deviceid = ? ;`,
    [deviceid],
    (err,results)=>{
      results.forEach((e,index)=>{
        results[index].date = e.date.toLocaleString();
      })
        // results.push(results)
      if(err) throw err
      //strigifyメソッドとparseメソッドでデータをcsvファイルにする
      const csvString = JSON.stringify(results);
      const str = JSON.parse(csvString);
      // 
      client.query(
        'SELECT numlimit FROM users WHERE deviceid = ?',
        [deviceid],
        (err,results)=>{
          str.push(results)
          
          const csvStringObj2 = stringify(str[str.length-1],{
            header:true,
            quoted_string:false
          })
          const csvStringSjis2 = Iconv.encode(csvStringObj2,'Shift.JIS');
          fs.writeFileSync('./public/limit.csv',csvStringSjis2); 
        }
      )

      str.forEach((data,index)=>{
        str[index].date =(data.date.substr(0,10));
        
      })
      
      //csvファイル化
      const csvStringObj = stringify(str,{
        header:true,
        quoted_string:false
      })
      const csvStringSjis = Iconv.encode(csvStringObj,'Shift.JIS');
      fs.writeFileSync('./public/result.csv',csvStringSjis); 


    }
  ),

  //データの最小最大値をデータページにレスポンスする
  // 
  client.query(
    'SELECT data FROM datatbl WHERE data = (SELECT MAX(data) FROM datatbl)',
    (error,results)=>{
      if(error) throw error
       

      
      res.render('data',{"result" : results})
    }
  )  
})

// exports.sayhello = function data(e){
//   
//   
// }

// exports.sayHello = function () {
//   
// }

//トップページ戻り保存していたセッション情報を破棄する(ログアウト)
app.get('/logout',(req,res)=>{
  req.session.destroy((error)=>{
    res.redirect('/');
  });
});

//指定したポート番号でサーバ構築
app.listen(port,()=>{
    
});
