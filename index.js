/**
 * criar conta
 * POST usuario + senha -> ok/nao
 * 
 * login
 * POST usuario + senha -> token(JWT)
 * 
 * POST soma a+b (privada)
 * jwt(header authentication) -> resultado da soma
 */



var express = require('express');
var app = express();
var md5 = require('md5');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser')
const mongo = require('mongodb').MongoClient
const MONGO_URL = '+srv://ana:23029373@cluster0-ofwdl.mongodb.net/autenticacao';
const HTTP_PORT = 3000;
const JWT_PRIVATE_KEY = "hjdakgsfdjhbsmongodbfdkgjhkdfjsgo96dfg86khj24235b5kj453j3245dfs7896sdv78876sdv";
var MONGO_CLIENT=null;



const conectarComMongoDB = (callback) => {
    console.log('iniciando conexao com mongodb...');
    mongo.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err);
        console.log('nao conectou no mongo');
        callback(err)
        return
      }
      MONGO_CLIENT = client;
      console.log('conectou no mongo');
      callback()
    })
}



const obterDbDoMongo = () => {
    return MONGO_CLIENT.db('autenticacao');
}



const obterCollectionDoMongo = (nomeDaCollection) => {
    return obterDbDoMongo().collection(nomeDaCollection);
}



const obterCollectionUser = () => {
    return obterCollectionDoMongo('user')
}



const criptografar = textoACriptografar => md5(textoACriptografar);



const somaQueSoUsuariosLogadosPodemFazer = (a,b) => {
    return a+b;
}



app.use(bodyParser());



app.post('/criar-conta', function (req, res) {
    const corpoDaRequisicao = req.body;
    const email = corpoDaRequisicao.email;
    const senha = corpoDaRequisicao.senha;
    const users = obterCollectionUser();
    users.findOne({email:email}, (err, user) => {
        if(err) return res.send('xi, erro ao ler collection no mongo');
        if(user) return res.send('xi, ja existe alguem com essa conta');
        const newUser = {
            email : email,
            senha : criptografar(senha)
        }
        console.log('newUser:',newUser)
        users.insertOne(newUser, (err) => {
            if(err){
                console.log('erro que deu no mongo:',err)
                return res.send('xi, erro ao criar novo usuario no mongo');
            }
            return res.send('eba, sua conta foi criada com sucesso!')
        })
    });
});



app.post('/login', function (req, res) {
    const corpoDaRequisicao = req.body;
    const email = corpoDaRequisicao.email;
    const senha = corpoDaRequisicao.senha;
    const users = obterCollectionUser();
    const senhaCriptografadaParaComparacao = criptografar(senha);
    console.log('senhaCriptografadaParaComparacao:',senhaCriptografadaParaComparacao);
    users.findOne({email:email, senha:senhaCriptografadaParaComparacao}, (err,user)=>{
        if(err) return res.send('xi, deu erro ao tentar ver se o usuario existe no mongo');
        if(!user) return res.send('xi, nao conhecemos este usuario/senha nao!')
        const dadoAGuardarDentroDoToken = { email: email }
        jwt.sign(dadoAGuardarDentroDoToken, JWT_PRIVATE_KEY, (err, token) => {
            if(err){
                console.log('erro ao gerar token:',err);
                return res.send('xi, tivemos problemas para gerar seu token');
            }
            return res.send(token);
        });
    });
});



const middlewareDeAutenticacao = (req, res, next) => {
    const token = req.headers.authorization;
    if(!token) return res.send('na moral, preciso do token pra continuar');
    jwt.verify(token, JWT_PRIVATE_KEY, (err, decoded) => {
        if(err) return res.send('calmae mano, me mandou token mas nao eh valido nao');
        const dadosQueForamGuardadosNoToken = decoded;
        req.email = dadosQueForamGuardadosNoToken.email;
        next();
    });
}



app.post('/soma', middlewareDeAutenticacao, function (req, res) {
    const corpoDaRequisicao = req.body;
    const a = corpoDaRequisicao.a;
    const b = corpoDaRequisicao.b;
    const resultado = somaQueSoUsuariosLogadosPodemFazer(a,b);
    return res.send('oi ' + req.email + ', o resultado eh ' + resultado);
});



const iniciarAplicacao = () => {
    conectarComMongoDB(()=>{
        console.log('iniciando servidor http...')
        app.listen(HTTP_PORT, function () {
            console.log('servidor http iniciado na porta' + HTTP_PORT);
          });
    });
}



iniciarAplicacao();