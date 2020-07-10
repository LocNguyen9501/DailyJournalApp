require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs")
const _ = require("lodash")
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

mongoose.connect("mongodb+srv://nguyenxloc:loclocloc@cluster0.njxjk.mongodb.net/blogDB",{
  useNewUrlParser: true,
  useUnifiedTopology: true
})
mongoose.set('useFindAndModify', false);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized: true,
}))
app.use(passport.initialize());
app.use(passport.session());

const postSchema = {
  title: String,
  content: String,
}

const Post = mongoose.model("Post",postSchema);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  posts: [postSchema]
})
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req,res){
  res.render("about",{aboutInfo:aboutContent,contactInfo: contactContent})
})

app.get("/about",function(req,res){
  if(req.isAuthenticated()){
    res.render("aboutAfterLogin",{aboutInfo:aboutContent})
  }else{
    res.redirect("/login");
  }
})

app.get("/contact",function(req,res){
  if(req.isAuthenticated()){
    res.render("contact",{contactInfo: contactContent})
  }else{
    res.redirect("/login");
  }
})

app.get("/home",function(req,res){
  if(req.isAuthenticated()){
    User.findOne({_id:req.user.id, posts:{$exists:true, $ne:[]}},function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          res.render("home",{homeContent:homeStartingContent,posts:foundUser.posts})
        }else{
            res.render("home",{homeContent:homeStartingContent,posts:foundUser})
        }
      }
    })
  }else{
    res.redirect("/login")
  }
})

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

//////////////////////// Posts/:posts route /////////////////////
app.route("/posts/:postId")

.get(function(req,res){
  const postId = req.params.postId;
  User.findOne({_id: req.user.id},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.posts.filter(post=>{
          if(post.id === postId){
            res.render("post", {foundPost: post,postId: req.params.postId});
          }
        })
      }
    }
  })
})

.post(function(req,res){
  User.findOneAndUpdate({_id: req.user.id},{$pull:{posts:{_id: req.params.postId}}},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      res.redirect("/home")
    }
  })
});

//////////////////////// Compose route /////////////////////
app.route("/compose")

.get(function(req,res){
  if(req.isAuthenticated()){
    res.render("compose")
  }else{
    res.redirect("/login")
  }
})

.post(function(req,res){

  const newPost = new Post({
    title: req.body.title,
    content: req.body.content,
  })

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.posts.push(newPost);
        foundUser.save(function(err){
          if(err){
            console.log(err);
          }
        });

        res.redirect("/home");
      }
    }
  })
});

//////////////////////// Login route ////////////////////////
app.route("/login")

.get(function(req,res){
  res.render("login")
})

.post(function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");
      })
    }
  })
});

//////////////////////// Register route /////////////////////
app.route("/register")

.get(function(req,res){
  res.render("register")
})

.post(function(req,res){
  User.register({username:req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
    }else{
        res.redirect("/login")
    }
  })
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
