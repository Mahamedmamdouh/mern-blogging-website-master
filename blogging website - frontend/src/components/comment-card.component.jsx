import { useContext, useState } from "react";
import { getDay } from "../common/date";
import { UserContext } from "../App";
import CommentsField from "./comment-field.component";
import { BlogContext } from "../pages/blog.page";
import axios from "axios";

export const CommentCard =({index,leftVal,commentData})=>{

      let {
        commented_by: {
          personal_info: { profile_img, fullname, username:commented_by_username }
        },
        commentedAt,
        comment,
        _id,
        children,
      } = commentData;

      let {blog,blog:{comments,activity,activity:{total_parent_comments},comments:{results:commentsArr},
           author:{personal_info:{username:blog_author}}},
           setBlog,setTotalParentCommentsLoaded} =useContext(BlogContext)

      let {userAuth:{access_token,username}}=useContext(UserContext)

      const [isReplaying,setReplying]=useState(false);
      const [isLoadingReplies, setIsLoadingReplies] = useState(false);

      const getParentIndex = () => {
            let startingPoint = index - 1;
            try {
                  while (commentsArr[startingPoint].childrenLevel >=commentData.childrenLevel) {

                        startingPoint--;
                        
                  }           
            } catch {
                  startingPoint = undefined
            }
            return startingPoint;
      }

      const removeCommentsCard = (startingPoint,isDelete = false)=>{
            console.log("Before removal:", commentsArr); 
            if(commentsArr[startingPoint]){

                  while(commentsArr[startingPoint]?.childrenLevel > commentData.childrenLevel){
                        commentsArr.splice(startingPoint,1);

                        if(!commentsArr[startingPoint]){
                              break;
                        }
                  }
            }
            if (isDelete) {
                  let parentIndex =getParentIndex()

                  if(parentIndex !== undefined){
                        commentsArr[parentIndex].children=commentsArr[parentIndex].children.filter(
                              child =>child !== _id)

                        if (!commentsArr[parentIndex].children.length) {
                              commentsArr[parentIndex].isReplyLoaded=false
                              
                        }
         
                  }
                  commentsArr.splice(index,1)
            }
            console.log("After removal:", commentsArr);
            
            if(commentData.childrenLevel==0 && isDelete){
                  setTotalParentCommentsLoaded(preVal => preVal - 1)

            }
            /*
            setBlog({
                  ...blog,comments:{results:commentsArr},
                  activity:{
                        ...activity,
                        total_parent_comments:total_parent_comments -
                       (commentData.childrenLevel == 0 && isDelete ? 1:0) }})
      }*/

                       setBlog({
                        ...blog,
                        comments: { ...comments, results: commentsArr },
                        activity: {
                          ...activity,
                          total_parent_comments: total_parent_comments - (commentData.childrenLevel === 0 && isDelete ? 1 : 0),
                        },
                      });
                  }


/*
                  const loadReplies = ({ skip = 0,currentIndex = index}) => {
                        if (commentsArr[currentIndex].children.length) {
                       hideReplies()
                            
                            axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/get-replies`, 
                              { _id:commentsArr[currentIndex]._id,skip })
                                 .then(({ data:{replies}}) => {
                                    commentsArr[currentIndex].isReplyLoaded = true;
                                    for(let i =0; i<replies.length;i++) {
                                        replies[i].childrenLevel = commentsArr[currentIndex].childrenLevel + 1;
                                        commentsArr.splice(currentIndex + 1 + i + skip, 0, replies[i]);
                                    }
                                    setBlog({ ...blog, comments: { ...comments, results: commentsArr } });
                                }  )
                              
                        }
                    };

                    */


   /*
const loadReplies = ({ skip = 0,currentIndex = index}) => {
      if (!isLoadingReplies) {
          setIsLoadingReplies(true);
          
          axios
              .post(`${import.meta.env.VITE_SERVER_DOMAIN}/get-replies`, { _id, skip })
              .then(({ data: { replies } }) => {
                  commentData.isReplyLoaded = true;
                  replies.forEach((reply, i) => {
                      reply.childrenLevel = commentData.childrenLevel + 1;
                      commentsArr.splice(index + 1 + i + skip, 0, reply);
                  });
                  setBlog({ ...blog, comments: { ...comments, results: commentsArr } });
              })
              .finally(() => setIsLoadingReplies(false));
      }
  };
   */

  const loadReplies = ({ skip = 0, currentIndex = index }) => {
      if (!isLoadingReplies) {
        setIsLoadingReplies(false);
    
        if (!commentsArr[currentIndex].isReplyLoaded) {
          axios
            .post(`${import.meta.env.VITE_SERVER_DOMAIN}/get-replies`, {
              _id: commentsArr[currentIndex]._id,
              skip,
            })
            .then(({ data: { replies } }) => {
              if (replies.length > 0) {
                // Mark replies as loaded
                commentsArr[currentIndex].isReplyLoaded = true;
    
                // Insert replies into the appropriate position
                replies.forEach((reply, i) => {
                  reply.childrenLevel = commentsArr[currentIndex].childrenLevel + 1;
                  const insertIndex = currentIndex + 1 + i + skip;
                  commentsArr.splice(insertIndex, 0, reply);
                });
    
                // Update state
                setBlog({
                  ...blog,
                  comments: {
                    ...comments,
                    results: [...commentsArr], // Spread to ensure state re-renders
                  },
                });
              }
            })
            .catch((error) => {
              console.error("Error loading replies:", error);
            })
            .finally(() => {
              setIsLoadingReplies(false);
            });
        } else {
          // Hide replies if already loaded
          hideReplies();
          setIsLoadingReplies(false);
        }
      }
    };
    
    
    



      const deleteComment=(e)=>{

            e.target.setAttribute('disabled',true);

            axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/delete-comment`
                  , { _id},{
                        headers:{
                              'Authorization':`Bearer ${access_token}` 
                        }
                  })
                  .then(()=>{
                        e.target.removeAttribute("disabled")
                        removeCommentsCard(index + 1 ,true)

                  })
                  .catch(err=>{
                        console.log(err)

                  })
            
      }



      const hideReplies=()=>{
            commentData.isReplyLoaded = false;
            removeCommentsCard(index + 1)
      }

     

      const handleReplyClick=()=>{

            if(!access_token){
                  return toast.error("login first to leave a reply")
            }

            setReplying(preVal =>!preVal)
                  
      }
      /*
      --------------------- i disabled the button of (Load more Replies) because i unable worked it 
                             iam loser ------------------------------------------ 

       
      const LoadMoreRepliesButton = () => {
  const parentIndex = getParentIndex();

  let button = <button
          onClick={() => loadReplies({ skip: index - parentIndex, currentIndex: parentIndex })}
          className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
        >
          Load more Replies
        </button>

  if (commentsArr[index + 1]) {
   
    if (commentsArr[index + 1].childrenLevel < commentsArr[index].childrenLevel) {
     if((index - parentIndex) < commentsArr[parentIndex].children.length){
     return button
   }
    }
  }

else{
   if(parentIndex){
      if((index - parentIndex) < commentsArr[parentIndex].children.length){
            return button
      }

   }

}
}
*/


      return(
            <div className="w-full" style={{paddingLeft:`${leftVal * 10 }px`}}>
                  <div className="my-5 p-6 rounded-md border border-grey">
                        <div className="flex gap-3 items-center mb-8">
                              <img src={profile_img} className="w-6 h-6 rounded-full" />
                              <p className="line-clamp-1">{fullname}@{commented_by_username}</p>
                              <p className="min-w-fit">{getDay(commentedAt)}</p>
                        </div>

                        <p className="font-gelasio text-xl ml-3">{comment}</p>

                        <div className="flex gap-5 items-center mt-5">

                              {
                                    commentData.isReplyLoaded ?(
                                    <button className="text-dark-grey p-2 px-3 hover:bg-grey/30
                                     rounded-md flex items-center gap-2" onClick={hideReplies}>
                                          <i className="fi fi-rs-comment-dots"></i>
                                            Hide Reply
                                    </button>):(  <button className="text-dark-grey p-2 px-3 hover:bg-grey/30
                                     rounded-md flex items-center gap-2" onClick={loadReplies}>
                                          <i className="fi fi-rs-comment-dots"></i>
                                          {children.length} Reply
                                    </button>
                              )}
                              <button className="underline"
                                      onClick={handleReplyClick}>Reply
                              </button>

                              {
                                          username ==commented_by_username ||
                                          username==blog_author ?
                                          <button 
                                               onClick={deleteComment}
                                               className="p-2 px-3 rounded-md border border-grey ml-auto 
                                                        hover:bg-red/30 hover:text-red flex items-center">
                                             <i className="fi fi-rr-trash pointer-events-none"></i>                     
                                          </button> : ""


                                    }
                        </div>
                        {
                              isReplaying ?
                              <div className="mt-8">
                                    <CommentsField action="reply"
                                    
                                                    index={index}
                                                    replyingTo={_id}
                                                    setReplying={setReplying}/>
                                                    
                              </div>:""
                        }
                  </div>
                  
                 
            </div>
      )
}




