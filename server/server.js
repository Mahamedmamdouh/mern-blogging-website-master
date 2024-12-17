import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt'
//schema
import User from './Schema/User.js';
import Blog from './Schema/Blog.js'
import Notification from './Schema/Notification.js'
import Comment from './Schema/Comment.js'

import {nanoid} from 'nanoid';
import jwt from 'jsonwebtoken'
import cors from 'cors'
//import bodyParser from "body-parser";
import admin from 'firebase-admin';
import serviceAccountKey from './mern-stack-website-blogging-firebase-adminsdk-e14kp-d86ca78073.json' assert { type: 'json' };
import { getAuth } from 'firebase-admin/auth';
import { S3Client, PutObjectCommand, $Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { populate } from 'dotenv';




const server =express();

let PORT = 3000;

// Initialize Firebase Admin SDK
admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey)
    });

// Regex for email and password validation
let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password
// Middleware
server.use(express.json())
server.use(cors())
//server.use(bodyParser.json()); // Parses JSON requests
// Middleware
mongoose.connect(process.env.DB_LOCATION,{
      autoIndex:true
})

//// Setting up S3 client with AWS SDK v3
const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
  });

// Generate presigned URL for S3 object upload
const generateUploadedURL = async () => {
      const date = new Date();
      const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
  
      const params = {
          Bucket: 'mernstack-blogging-website',
          Key: imageName,
          ContentType: 'image/jpeg'
      };
  
      const command = new PutObjectCommand(params);
      const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 1000 });
  
      return uploadURL;
  };


const verifyJWT=(req,res,next)=>{
      const authHeader =req.headers['authorization'];
      const token = authHeader && authHeader.split(" ")[1];

      if(token == null){
            return res.status(401).json({error:"No access token "})
      }

      jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>{
            if(err){
                  return res.status(403).json({error:"Access token is invalid"})
            }
            req.user=user.id; 
            next()
      })
}  
 
// Helper function to format the response data
const formatDataToSend =(user)=>{
      const access_token=jwt.sign({id:user._id},process.env.SECRET_ACCESS_KEY)
      return{
            access_token,
            profile_img:user.personal_info.profile_img,
            username:user.personal_info.username,
            fullname:user.personal_info.fullname

      }
}

const generateUserName=async(email)=>{
      let username =email.split("@")[0];

      let userNameExists = await User.exists({"personal_info.username":username}).then((result)=>result)
      userNameExists ? username += nanoid().substring(0,5):""  ;
      return username    

}
server.post("/signup",(req,res)=>{
      let {fullname,email,password}=req.body;

      // validating the data from frontend

      if(fullname.length < 3){
            return res.status(403).json({"error":"FullName must be at least 3 letters long"})

      }

      if(!email.length ){
            return res.status(403).json({"error":"Enter Email"})

      }
      if(!emailRegex.test(email)){
            return res.status(403).json({"error":"Email is invalid"})
      }
      if(!passwordRegex.test(password)){
            return res.status(403).json({"error":"Password should be 6 to 20 character long with a numeric, 1 lowercase and 1 uppercase letters"})    
      }
      bcrypt.hash(password,10,async(err,hashed_password)=>{
            let username = await generateUserName(email)

            let user =new User({
                  personal_info:{fullname,email,password:hashed_password,username}

            })
            user.save().then((u)=>{
                  return res.status(200).json(formatDataToSend(u))

            }).catch(err=>{
                  if(err.code == 11000){
                        return res.status(500).json({"error":"Email already exists"})
                  }
                  return res.status(500).json({"error":err.massage})
            })
          
      })

   //  return res.status(200).json({"status":"okay"})

})


//upload image url route

server.get('/get-upload-url', (req, res) => {
      generateUploadedURL()
          .then(url => res.status(200).json({ uploadURL: url }))
          .catch(err => res.status(500).json({ error: err.message }));
  });
  




server.post('/signin',(req,res)=>{
            
      let {email,password}=req.body;
      User.findOne({"personal_info.email":email}).then((user)=>{
            if(!user){
                  return res.status(403).json({"error":"Email not found"})
            }
            if(!user.google_auth){
                  bcrypt.compare(password,user.personal_info.password,(err,result)=>{
                        if(err){
                              return res.status(403).json({"error":"Error occurred while login please try again"})
                        }
                        if(!result){
                              return res.status(403).json({"error":"Incorrect password"})
      
                        }else{
                              return res.status(200).json(formatDataToSend(user))
                        }     
                  })    
            }else{
                  return res.status(403).json({"error":"Account was created using google. Try logging in with google"})
            }
           
      }).catch(err=>{
            console.log(err.massage)
            return res.status(500).json({"error": err.massage})

      })
      })

      server.post('/google-auth',async(req,res)=>{
            let {access_token} = req.body;

            getAuth()
            .verifyIdToken(access_token)
            .then(async(decodeUser)=>{
                  let {email,name,picture} = decodeUser;

                  picture =picture.replace("s96-c","s384-c");

                  let user = await User.findOne({"personal_info.email":email}).select(`personal_info.fullname 
                                                 personal_info.username 
                                                 personal_info.profile_img google_auth `)
                                                 .then((u)=>{
                                                      return u || null })
                                                 .catch(err=>{
                                                      return res.status(500).json({"error":err.message})
                                                 })
                if(user){
                  if(!user.google_auth){
                        return res.status(403).json({"error":`This email was signed up without google.
                                                             please log in with password to access the account `})
                  }
                } else{
                  let username =await generateUserName(email)

                  user =new User({
                        personal_info:{fullname:name,email,profile_img:picture,username},
                        google_auth:true
                  })
                  await user.save().then((u)=>{
                        user = u ;
                  }).catch(err=>{
                        return res.status(500).json({"error":err.message})
                  })
                }  
                return res.status(200).json(formatDataToSend(user))                              
                                          
                 }).catch(err=>{
                  return res.status(500).json({"error":`Failed to authenticate you with google.
                                                       Try with some other google account`})
               })
             })

             server.post('/change-password',verifyJWT,(req,res)=>{
                  let {currentPassword,newPassword} = req.body;

                  if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword) ){
                        return res.status(403).json({error:"Password should be 6 to 20 character long with a numeric, 1 lowercase and 1 uppercase letters"})
                  }
                  User.findOne({_id:req.user})
                  .then((user)=>{
                        if(user.google_auth){
                              return res.status(403).json({error:"You can't change account's password because you logged in through google"})
                        }
                        bcrypt.compare(currentPassword,user.personal_info.password,(err,result)=>{
                              if(err){
                                    return res.status(500).json({error:"Some error occured while changing the password, please try again later"}) 
                              }
                              if(!result){
                                    return res.status(403).json({error:"Incorrect current password"})
                              }
                              bcrypt.hash(newPassword,10,(err,hashed_password)=>{
                                    User.findOneAndUpdate({_id:req.user},{"personal_info.password":hashed_password})
                                    .then((u)=>{
                                          return res.status(200).json({status:'password changed'})
                                    })
                                    .catch(err=>{
                                          return res.status(500).json({error:"Some error occured while saving new password,please try again later"})

                                    })
                              })
                        })
                  })
                  .catch(err=>{
                        console.log(err)
                        res.status(500).json({error:"User is not found"})

                  })
             })











      server.post('/latest-blogs',(req,res)=>{
            let {page} = req.body
            let maxLimit= 5;

            Blog.find({draft:false})
                .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
                .sort({"publishedAt":-1})
                .select("blog_id title des banner activity tags publishedAt -_id ")
                .skip((page - 1 ) * maxLimit)
                .limit(maxLimit)
                .then(blogs=>{
                  return res.status(200).json({blogs})
                })
                .catch(err=>{
                  return res.status(500).json({error:err.massage})
                })
      }) 
      
      server.post('/all-latest-blogs-count',(req,res)=>{
            Blog.countDocuments({draft:false})
            .then(count=>{
                  return res.status(200).json({totalDocs:count})
            })
            .catch(err=>{
                  console.log(err.massage)
                  return res.status(500).json({error:err.message})
            })
      })
      /*************total_reads not total_read */
      server.get('/trending-blogs',(req,res)=>{
            Blog.find({draft:false})
            .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
            .sort({"activity.total_reads":-1,"activity.total_likes":-1,"publishedAt":-1})
            .select("blog_id title publishedAt -_id ")
            .limit(5)
            .then(blogs=>{
              return res.status(200).json({blogs})
            })
            .catch(err=>{
              return res.status(500).json({error:err.massage})
            })

      })

      server.post('/search-blogs', (req, res) => {
            let { tag, query,author, page,limit,eliminate_blog } = req.body;
            let findQuery;
        
            if (tag) {
                findQuery = { tags: tag, draft: false,blog_id:{$ne:eliminate_blog} };
            } else if (query) {
                findQuery = { draft: false, title: new RegExp(query, 'i') };
            } else if(author){
                  findQuery={author,draft:false}
            }
        
            let maxLimit= limit ? limit : 2;           
             Blog.find(findQuery)  
            .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
            .sort({"publishedAt":-1})
            .select("blog_id title banner des activity tags publishedAt -_id ")
            .skip((page -1) * maxLimit)
            .limit(maxLimit) 
            .then(blogs=>{
              return res.status(200).json({blogs})
            })
            .catch(err=>{
              return res.status(500).json({error:err.massage})
            })

      })

      server.post('/search-blogs-count',(req,res)=>{
            
            let {tag,query,author}=req.body;

            let findQuery;
            
            if (tag) {
                  findQuery = {tags:tag,draft:false}                  
            } else if(query) {
                  findQuery = {draft:false,title:new RegExp(query,'i')} 
                  
            } else if(author){
                  findQuery={author,draft:false}
            }
            Blog.countDocuments(findQuery)
            .then(count=>{
                  return res.status(200).json({totalDocs:count})
            })
            .catch(err=>{
                  console.log(err.message);
                  return res.status(500).json({error:err.message})
                  
            })
      })
      server.post('/search-users',(req,res)=>{
            let {query} =req.body;

            User.find({"personal_info.username":new RegExp(query,'i')})
                .limit(50)
                .select("personal_info.fullname personal_info.username personal_info.profile_img-_id")
                .then(users=>{
                  return res.status(200).json({users})
                })
                .catch(err=>{
                  return res.status(500).json({error:err.message})
                })
      })

      server.post('/get-profile',(req,res)=>{
            let {username} = req.body;

            User.findOne({"personal_info.username":username})
            .select("-personal_info.password -google_auth -updateAt -blogs")
            .then(user=>{
                  console.log(user)
                  return res.status(200).json(user)
            })
            .catch(err=>{
                  console.log(err);
                  return res.status(500).json({error:err.message})
            })
      })


      server.post('/update-profile-img',verifyJWT,(req,res)=>{

            let {url} =req.body;

            User.findOneAndUpdate({_id:req.user},{'personal_info.profile_img':url})
            .then(()=>{
                  return res.status(200).json({profile_img:url})
            })
            .catch(err=>{
                  return res.status(500).json({error:err.message})
            })

      })
      server.post('/update-profile',verifyJWT,(req,res)=>{
            let {username,bio,social_links} = req.body;
            
            let bioLimit = 150;

            if(username.length < 3){
                  return res.status(403).json({error:'Username should be at least letters long'})
            }
            if(bio.length > bioLimit){
                  return res.status(403).json({error:`Bio should not be more than ${bioLimit} characters`})
            }
            
            let socialLinksArr = Object.keys(social_links);

      

            try {

                  for(let i =0;i<socialLinksArr.length;i++) {
                        if(social_links[socialLinksArr[i]].length){
                              let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

                              if (!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !=='website') {
                                    return res.status(403).json({error:`${socialLinksArr[i]} link is invalid. you must enter a full link `})
                                    
                              }
                        }

                  }
                  
            } catch (err) {
                  return res.status(500).json({error:'You must provide full social links with http(s) included'})
                  
            }

            let updateObj={
                  "personal_info.username":username,
                  'personal_info.bio':bio,
                  social_links
            }
            User.findOneAndUpdate({_id:req.user},updateObj,{
                  runValidators:true
            })
            .then(()=>{
                  return res.status(200).json({username})
            })
            .catch(err=>{
                  if(err.code === 11000){
                        return res.status(409).json({error:'username is already taken'})

                  }
                  return res.status(500).json({error:err.message})
                        
            })






       })
   
      server.post('/create-blog',verifyJWT,(req,res)=>{

            let authorId=req.user;

            let {title,banner,des,content,tags,draft,id} =req.body;
            
            if(!title.length){
                  return res.status(403).json({error:"You must provide a title "})
            }
  
            if(!draft){
                  if(!des.length || des.length > 200){
                        return res.status(403).json({error:"You must provide blog description under 200 characters"})
                  }
                  if(!banner.length){
                        return res.status(403).json({error:"You must provide blog banner to publish the blog"})
                  }
                  if(!content.blocks.length){
                        return res.status(403).json({error:"There must be some blog content to publish the blog"})
                  }
                  if(!tags.length || tags.length > 4){
                        return res.status(403).json({error:"Provide tags in order to publish the blog, maximum 4"})
                  }
            }
            tags=tags.map(tag=>tag.toLowerCase());
            let blog_id= id || title.replace(/[^a-zA-Z0-9]/g,' ').replace(/\s+/g,'-').trim() +nanoid();

            if(id){

                  Blog.findOneAndUpdate({blog_id},{title,des,banner,content,tags,draft:draft ? draft:false})
                      .then(()=>{
                        return res.status(200).json({id:blog_id})

                      })
                      .catch((err)=>{
                        return res.status(500).json({error:err.message})
                      })

            }else{
                  let blog=new Blog({
                        title,des,banner,content,tags,author:authorId,blog_id,draft:Boolean(draft)
                  })
                  blog.save().then(blog=>{
                        let incrementVal = draft ? 0:1;
      
                        User.findOneAndUpdate({_id:authorId},
                                              {$inc:{"account_info.total_posts":incrementVal},
                                               $push:{"blogs":blog._id}}).then(user=>{
                                                return res.status(200).json({id:blog.blog_id})
                                               }).catch(err=>{
                                                return res.status(500).json({error:"Failed to update total posts number"})
                         })
                  }).catch(err=>{
                        res.status(500).json({error: err.message})
                  })
            }            
      })
    
     
      server.post('/get-blog',(req,res)=>{
            let { blog_id,draft,mode} = req.body;

            let incrementVal=mode!='edit' ? 1 : 0;

            Blog.findOneAndUpdate({blog_id},{$inc:{"activity.total_reads":incrementVal}})
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .select("title des content banner activity publishedAt blog_id tags")
            .then(blog=>{

                  User.findOneAndUpdate(
                        { "personal_info.username": blog.author.personal_info.username },
                        { $inc: { "account_info.total_reads": incrementVal } }
                      )
                      .catch(err => {
                        return res.status(500).json({ error: err.message });
                      });

                      if (blog.draft && !draft) {
                        return res.status(500).json({error:'you can not draft blogs'})
                        
                  }
                      
                  return res.status(200).json({blog});
            })
            .catch(err=>{                 
                  return res.status(500).json({error:err.message})
            })
           
      })   
            /*
            server.post('/get-blog', (req, res) => {
                  let { blog_id } = req.body;
                  let incrementVal = 1;
                
                  Blog.findOneAndUpdate({ blog_id }, { $inc: { "activity.total_reads": incrementVal } })
                    .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
                    .select("title des content banner activity publishesAt blog_id tags")
                    .then(blog => {
                      if (!blog) {
                        return res.status(404).json({ error: "Blog not found" });
                      }
                
                      // Ensure the author information is available
                      if (blog.author && blog.author.personal_info && blog.author.personal_info.username) {
                        User.findOneAndUpdate(
                          { "personal_info.username": blog.author.personal_info.username },
                          { $inc: { "account_info.total_reads": incrementVal } },
                          { new: true }  // Ensure updated document is returned
                        ).then(user => {
                          if (user) {
                            console.log("User updated successfully:", user);
                            return res.status(200).json({ blog });
                          } else {
                            console.log("User not found");
                            return res.status(500).json({ error: "User not found" });
                          }
                        }).catch(err => {
                          console.error("Error updating user:", err);
                          return res.status(500).json({ error: err.message });
                        });
                      } else {
                        return res.status(500).json({ error: "Author information is missing or invalid" });
                      }
                    })
                    .catch(err => {
                      console.error("Error updating blog:", err);
                      return res.status(500).json({ error: err.message });
                    });
                });
                */
         server.post('/like-blog',verifyJWT,(req,res)=>{
            let user_id =req.user;
            let {_id,isLikedByUser}=req.body;

            let incrementVal = !isLikedByUser ? 1 :-1;

            Blog.findOneAndUpdate({_id},{$inc:{"activity.total_likes":incrementVal}})
            .then(blog=>{
                  if (!isLikedByUser) {
                        let like=new Notification({
                              type:"like",
                              blog:_id,
                              notification_for:blog.author,
                              user:user_id
                        })
                        like.save().then(notification=>{
                              return res.status(200).json({liked_by_user:true})
                        })
                        
                  }else{
                        Notification.findOneAndDelete({user:user_id,blog:_id,type:"like"})
                        .then(data=>{
                              return res.status(200).json({liked_by_user:false});
                        })
                        .catch(err=>{
                              return res.status(200).json({error:err.message})
                        })
                  }
            })
      }) 

            server.post('/isliked-by-user',verifyJWT,(req,res)=>{

                  let user_id=req.user;
                  let {_id}=req.body;

                  Notification.exists({user:user_id,type:"like",blog:_id})
                  .then(result=>{
                        return res.status(200).json({result});
                  })
                  .catch(err=>{
                        return res.status(500).json({error:err.message});
                  })

            })

            server.post('/add-comment',verifyJWT,(req,res)=>{
                  let user_id=req.user;

                  let {_id,comment,blog_author,replying_to, notification_id} =req.body

                  if(!comment.length){
                        return res.status(403).json({error:'Write something to leave a comment...'})
                  }
                  //creating a comment doc

                  let commentObj ={
                        blog_id:_id,blog_author,comment,commented_by:user_id,
                  }

                  if(replying_to){
                        commentObj.parent = replying_to;
                        commentObj.isReply =true
                  }
                       

                  new Comment(commentObj).save().then( async commentFile =>{

                        let {comment, commentedAt,children} =commentFile;


                        Blog.findOneAndUpdate({_id},{$push:{"comments":commentFile._id},
                              $inc:{"activity.total_comments":1 ,"activity.total_parent_comments": replying_to ? 0:1 },})
                              .then(blog=>{
                                    console.log("New comment created")
                              })
                              
                              let notificationObj={
                                    type:replying_to ? "reply":"comment",
                                    blog:_id,
                                    notification_for:blog_author,
                                    user:user_id,
                                    comment:commentFile._id
                              } 
                             
                              if(replying_to){
                                    notificationObj.replied_on_comment = replying_to;

                                    await Comment.findOneAndUpdate({_id:replying_to},{$push:{children:commentFile._id}})
                                    .then(replayingToCommentDoc=>{notificationObj.notification_for = replayingToCommentDoc.commented_by})
                              }

                              if(notification_id){
                                    Notification.findOneAndUpdate({_id:notification_id},{reply:commentFile._id})
                                    .then(notification=> console.log('notification updated'))

                              }
                                    

                              new Notification(notificationObj).save().then(notification =>console.log('new notification created'))
                          

                              return res.status(200).json({
                                    comment,commentedAt,_id:commentFile._id,user_id,children
                              })
                  })
            })
            server.post('/get-blog-comments',(req,res)=>{
                  let {blog_id,skip}=req.body;

                  let maxLimit = 7;

                  Comment.find({blog_id, isReply:false})
                  .populate("commented_by","personal_info.username personal_info.fullname personal_info.profile_img ")
                  .skip(skip)
                  .limit(maxLimit)
                  .sort({
                        'commentedAt':-1
                  })
                  .then(comment=>{
                        console.log(comment,blog_id,skip)
                        return res.status(200).json(comment);
                  })
                  .catch(err=>{
                        console.log(err.message)
                        return res.status(500).json({error:err.message}); 

                  })
            })

            server.post("/get-replies",(req,res)=>{

                  let {_id,skip}=req.body;
                  let maxLimit=5;

                  Comment.findOne({_id})
                  .populate({
                        path:"children",
                        options:{
                              limit:maxLimit,
                              skip:skip,
                              sort:{'commentedAt':-1}
                        },
                        populate:{
                              path:'commented_by',
                              select:"personal_info.profile_img personal_info.fullname personal_info.username"
                        },
                        select:"-blog_id -updatedAt"
                                      
                  }).select("children")
                  .then(doc=>{
                        return res.status(200).json({replies:doc.children})
                  })
                  .catch(err=>{
                        return res.status(500).json({error:err.message});

                  })
            })

            /*

            const deleteComments=(_id)=>{
                  Comment.findOne({_id})
                  .then(comment=>{
                        console.log("Deleting comment:", _id)
                        if(comment.parent){
                              Comment.findOneAndUpdate({_id:comment.parent},{$pull:{children:_id}})
                              .then(data=>console.log('comment delete from parent'))
                              .catch(err=>console.log(err))
                        }

                        Notification.findOneAndDelete({comment:_id}).then(()=>
                              console.log('comment notification deleted'))

                        Notification.findOneAndDelete({reply:_id}).then(()=>
                              console.log('reply notification deleted'))

                        Blog.findOneAndUpdate({_id:comment.blog_id},
                              {$pull:{comments:_id},
                               $inc:{ "activity.total_comments":-1},
                                    'activity.total_parent_comments':comment.parent ? 0: -1})
                        .then(()=>{
                              if(comment.children.length){
                                    comment.children.map(replies=>{
                                          deleteComments(replies)
                                    })
                              }
                        })
                  })
                  .catch(err=>{
                        console.log(err.message)
                  })
            }
              */

            const deleteComments = async (_id) => {
                  try {
                    const comment = await Comment.findOne({ _id });
                    if (!comment) {
                      console.log("Comment not found:", _id);
                      return;
                    }
                
                    console.log("Deleting comment:", _id);
                
                    // Remove from parent comment
                    if (comment.parent) {
                      await Comment.findOneAndUpdate(
                        { _id: comment.parent },
                        { $pull: { children: _id } }
                      );
                      console.log("Comment removed from parent.");
                    }
                
                    // Delete notifications associated with this comment
                    await Notification.deleteMany({ $or: [{ comment: _id }, { reply: _id }] });
                    console.log("Notifications deleted.");
                
                    // Remove from blog's comment array and update activity
                    await Blog.findOneAndUpdate(
                      { _id: comment.blog_id },
                      {
                        $pull: { comments: _id },
                        $inc: {
                          "activity.total_comments": -1,
                          "activity.total_parent_comments": comment.parent ? 0 : -1,
                        },
                      }
                    );
                    console.log("Comment removed from blog.");
                
                    // Recursively delete child comments
                    if (comment.children && comment.children.length) {
                      for (const replyId of comment.children) {
                        await deleteComments(replyId); // Recursive deletion
                      }
                    }
                
                    // Finally, delete the comment itself
                    await Comment.deleteOne({ _id });
                    console.log("Comment deleted successfully:", _id);
                  } catch (error) {
                    console.error("Error deleting comment:", error.message);
                  }
                };
                
             

            server.post('/delete-comment',verifyJWT,(req,res)=>{
                  let user_id = req.user;
                  let {_id} = req.body;
                  
                  Comment.findOne({_id})
                  .then(comment =>{
                        if(user_id == comment.commented_by || user_id==comment.blog_author){
                              deleteComments(_id);

                              return res.status(200).json({status:'done'});
                        }else{
                              return res.status(403).json({error:"You can not delete this comment"})
                        }
                  })
                  .catch(err => {
                        return res.status(500).json({ error: err.message });
                      });
                  });

                  server.get('/new-notification',verifyJWT,(req,res)=>{
                        let user_id = req.user;

                        Notification.exists({notification_for:user_id, seen:false, user:{$ne:user_id}})
                        .then(result=>{
                              if(result){
                                    return res.status(200).json({ new_notification_available: !!result });
                                   // return res.status(200).json({new_notification_available:true})
                              //}else{
                             //      return res.status(500).json({new_notification_available: false})
                              }
                        })
                        .catch(err =>{
                              console.error("Error fetching notifications:", err.message);
                              return res.status(500).json({ error: "Internal Server Error" });
                        })
                  })

                  server.post('/notifications',verifyJWT,(req,res)=>{
                        let user_id =req.user;

                        let {page,filter,deletedDocCount} = req.body;

                        let maxLimit=10;

                        let findQuery={notification_for:user_id,user:{$ne:user_id}}

                        let skipDocs =(page-1) * maxLimit

                        if(filter != 'all'){
                              findQuery.type=filter
                        }

                        if(deletedDocCount){
                              skipDocs -=deletedDocCount
                        }
                        Notification.find(findQuery)
                        .skip(skipDocs)
                        .limit(maxLimit)
                        .populate('blog','title blog_id')
                        .populate("user",'personal_info.fullname personal_info.username personal_info.profile_img')
                        .populate("comment","comment")
                        .populate("replied_on_comment","comment")
                        .populate("reply","comment")
                        .sort({createdAt:-1})
                        .select("createdAt type seen reply")
                        .then(notifications=>{

                              Notification.updateMany(findQuery,{seen: true})
                              .skip(skipDocs)
                              .limit(maxLimit)
                              .then(()=>console.log('notification seen'));

                              return res.status(200).json({notifications})
                        })
                        .catch(err=>{
                              console.log(err.message)
                              return res.status(500).json({error:err.message})
                        })

                  })

                  server.post('/all-notifications-count',verifyJWT,(req,res)=>{
                        let user_id = req.user;

                        let {filter} = req.body;

                        let findQuery = {notification_for:user_id,user:{$ne:user_id}}

                        if(filter !='all'){
                              findQuery.type=filter
                        }

                        Notification.countDocuments(findQuery)
                        .then(count=>{
                              return res.status(200).json({totalDocs:count})

                        })
                        .catch(err=>{
                              
                              return res.status(500).json({error:err.message})
                        })

                  })
                 

                  server.post('/user-written-blogs',verifyJWT,(req,res)=>{
                        
                        let user_id =req.user;

                        let {page,draft,query,deletedDocCount}=req.body;

                        let maxLimit=5;
                        let skipDocs = (page - 1)* maxLimit;

                        if(deletedDocCount){
                              skip -= deletedDocCount;
                        }
                        Blog.find({author:user_id,draft,title:new RegExp(query,'i')})
                        .skip(skipDocs)
                        .limit(maxLimit)
                        .sort({publishedAt:-1})
                        .select('title banner publishedAt blog_id activity des draft -_id ')
                        .then(blogs =>{
                              return res.status(200).json({blogs})
                        })
                        .catch(err=>{
                              
                              return res.status(500).json({error:err.message})
                        })
                  })


                  server.post('/user-written-blogs-count',verifyJWT,(req,res)=>{
                        let user_id =req.user;

                        let {draft,query} = req.body;

                        Blog.countDocuments({author:user_id,draft,title:new RegExp(query,'i')})
                        .then(count=>{
                              return res.status(200).json({totalDocs:count})
                        })
                        .catch(err =>{
                              console.log(err.message);
                              return res.status(500).json({error:err.message})
                        })

                  })

                  server.post('/delete-blog',verifyJWT,(req,res)=>{

                        let user_id =req.user;

                        let { blog_id } = req.body;

                        Blog.findOneAndDelete({blog_id})
                        .then(blog =>{
                              Notification.deleteMany({blog:blog._id}).then(data =>console.log('notification deleted'));

                              Comment.deleteMany({blog_id:blog._id}).then(data =>console.log('comments deleted'));

                              User.findOneAndUpdate({_id:user_id}, {$pull:{blog:blog._id},$inc:{'account_info.total_posts':-1}})
                              .then(user => console.log('BLog deleted'));

                              return res.status(200).json({status:'done'})
                        })
                        .catch(err=>{
                              return res.status(500).json({error:err.message})

                        })
                  })
         
                  server.listen(PORT,()=>{
                        console.log(`listening on port -> ${PORT}`)

                  })



     
/*

const deleteComments = async (_id) => {
    const stack = [_id];
    while (stack.length) {
        const currentId = stack.pop();
        const comment = await Comment.findOne({ _id: currentId });

        if (comment.children.length) {
            stack.push(...comment.children);
        }

        await Notification.deleteMany({ $or: [{ comment: currentId }, { reply: currentId }] });
        await Blog.findOneAndUpdate(
            { _id: comment.blog_id },
            { $pull: { comments: currentId }, $inc: { "activity.total_comments": -1 } }
        );

        if (!comment.parent) {
            await Blog.findOneAndUpdate(
                { _id: comment.blog_id },
                { $inc: { "activity.total_parent_comments": -1 } }
            );
        }
    }
};

*/
/*
      const deleteComments=(_id)=>{
                  Comment.findOne({_id})
                  .then(comment=>{
                        if(comment.parent){
                              Comment.findOneAndUpdate({_id:comment.parent},{$pull:{children:_id}})
                              .then(data=>console.log('comment delete from parent'))
                              .catch(err=>console.log(err))
                        }

                        Notification.findOneAndDelete({comment:_id}).then(notification=>
                              console.log('comment notification deleted'))

                        Notification.findOneAndDelete({reply:_id}).then(notification=>
                              console.log('reply notification deleted'))

                        Blog.findOneAndUpdate({_id:comment.blog_id},{$pull:{comments:_id},
                        $inc:{"activity.total_comments":-1},'activity.total_parent_comments':comment.parent ? 0: -1})
                        .then(blog=>{
                              if(comment.children.length){
                                    comment.children.map(replies=>{
                                          deleteComments(replies)
                                    })
                              }
                        })
                  })
                  .catch(err=>{
                        console.log(err.message)
                  })
            }
*/ 