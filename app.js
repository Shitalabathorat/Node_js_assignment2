const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "twitterClone.db");

const app = express();

app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//verification of  JWT token
const authenticateToken = (request, response, next) => {
  const { tweet } = request.body;
  const { tweetId } = request.params;
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        request.tweetId = tweetId;
        request.tweet = tweet;
        next();
      }
    });
  }
};

//register user API 1
app.post("/register", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${userName}';`;
  console.log(username, password, name, gender);
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
            INSERT INTO
                user(name, username, password, gender)
            VALUES(
                '${name}'
                '${username}'
                '${hashedPassword}'
                '${gender}'

            );`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User create successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//user login API 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  console.log(username, password);
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const jwtToken = (jwtToken = jwt.sign(dbUser, "MY_SECRET_TOKEN"));
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3
app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_Id, name, username, gender } = payload;
  console.log(name);
  const getTweetsFeedQuery = `
        SELECT 
            username,
            tweet,
            date_time AS dateTime
        FROM 
            follower INNER JOIN tweet ON follower.following_user_id=tweet.user_id INNER JOIN user ON user.user_id=follower.following_user_id
        WHERE follower.follower_user_id=${user_id}
        ORDER BY 
            date_time DESC 
        LIMIT 4;`;
  const tweetFeedArray = await db.all(getTweetsFeedQuery);
  response.send(tweetFeedArray);
});

//API 4
app.get("/user/following", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowersQuery = `
        SELECT 
            name
        FROM 
            user INNER JOIN follower ON user.user_id=follower.following_user_id
        WHERE 
            follower.follower_user_id=${user_id};`;
  const userFollowersArray = await db.all(userFollowersQuery);
  response.send(userFollowersArray);
});

//API 5
app.get("/user/followers", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowersQuery = `
        SELECT 
            name
        FROM 
            user INNER JOIN follower ON user.user_id=follower.follower_user_id
        WHERE 
            follower.following_user_id=${user_id};`;
  const userFollowersArray = await db.all(userFollowersQuery);
  response.send(userFollowersArray);
});

//API 6
app.get("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, tweetId);
  const tweetsQuery = `SELECT * FROM tweet WHERE tweet_id='${tweetId}';`;
  const tweetsResult = await db.get(tweetsQuery);
  ///response.send(tweetsResult);
  const userFollowersQuery = `
      SELECT * 
      FROM 
          follower INNER JOIN user ON user.user_id=followers.following_user_id

      WHERE 
          follower.follower_user_id=${user_id};`;
  const userFollowers = await db.all(userFollowersQuery);
  //response.send(userFollowers);
  if (
    userFollowers.some((item) => item.following_user_id === tweetResult.user_id)
  ) {
    console.log(tweetResult);
    console.log("----------");
    console.log(userFollowers);
    const getTweetDetailsQuery = `
         SELECT 
             tweet,
             COUNT(DISTINCT(like.like_id)) AS likes,
             COUNT(DISTINCT(reply.reply_id)) AS replies,
             tweet.date_time AS dateTime 
         FROM 
             tweet INNER JOIN like ON tweet.tweet_id=like.tweet_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
        WHERE 
            tweet.tweet_id=${tweetId} AND tweet.user_id=${userFollowers[0].user_id};`;
    const tweetDetails = await db.get(getTweetDetailsQuery);
    response.send(tweetDetails);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

///API 7 wrong
/*
app.get("/tweets/:tweetId/likes", authenticateToken, async(request, response)=>{
    const {tweetId}=request;
    const {payload}=request;
    const {user_id, name, username, gender}=payload;
    console.log(name, tweetId);

    const getLikedUserQuery=`
       SELECT 
           *
        FROM 
            follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id INNER JOIN like ON like.tweet_id=tweet.tweet_id
            INNER JOIN user ON user.user_id=like.user_id
        WHERE
            tweet.tweet_id=${tweetId} AND follower.follower_user_id=lie_user_id
        WHERE 
          tweet.tweet_id=${tweetId} AND follower.follower_user_id=${user_id};`;
    const likedUsers=await db.all(getLikedUserQuery);
    console.log(likedUsers);
    if (likedUsers.length!==0){
        let likes=[];
        const getNamesArray=(likedUsers)=>{
            for (let item of likedUsers){
                likes.push(item.username);
            }
        };
        getNamesArray(likedUsers);
        response.send({ likes});

    }else{
        response.status(401);
        response.send("Invalid Request");
    }

});*/
//API 8 wrong
/*
app.get(
  "/tweets/:tweetId/replies",
  authenticationToken,
  async (request, response) => {
    const { tweetId } = request;
    const { payload } = request;
    const { user_id, name, username, gender } = payload;
    console.log(name, tweetId);

    const getRepliedUserQuery = `
       SELECT 
           *
        FROM 
            follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
            INNER JOIN user ON user.user_id=reply.user_id
        WHERE 
          tweet.tweet_id=${tweetId} AND follower.follower_user_id=${user_id};`;
    const repliedUsers = await db.all(getRepliedUserQuery);
    console.log(repliedUsers);

    if (repliedUsers.length !== 0) {
      let replies = [];
      const getNamesArray = (repliedUsers) => {
        for (let item of repliedUsers) {
          let object = {
            name: item.name,
            reply: item.reply,
          };
          replies.push(object);
        }
      };
      getNamesArray(repliedUsers);
      response.send({ replies });
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);*/

//API 9 wrong
/*

app.get("/user/tweets", authenticationToken, async (request, response) => {
    const { payload } = request;
    const { user_id, name, username, gender } = payload;
    console.log(name, user_id);

    const getTweetDetailsQuery = `
       SELECT 
           tweet.tweet As tweet,
           COUNT(DISTINCT(like.like_id)) AS likes,
           COUNT(DISTINCT(reply.reply_id)) AS replies,
           tweet.date_time AS dateTime
        FROM 
           user INNER JOIN tweet ON user.user_id=tweet.user_id INNER JOIN like ON like.tweet_id=tweet.tweet_id INNER JOIN reply ON reply.tweet_id=tweet.tweet_id
        WHERE
            user.user_id=${user_id} 
        GROUP BY 
            tweet.tweet_id;`;
    const tweetDetails = await db.all(getTweetDetailsQuery);
    response.send(tweetDetails);
    */
//API 10
app.post("/user/tweets", authenticateToken, async (request, response) => {
  const { tweet } = request;
  const { tweetId } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, tweetId);
  const postTweetQuery = `
        INSERT INTO 
            tweet(tweet, user_id)
        VALUES(
            '${tweet}', ${user_id}
        )
    ;`;
  await db.run(postTweetQuery);
  response.send("Create a Tweet");
});

//API 11 wrong
/*
app.delete("/tweets/:tweetId", authenticateToken, async (request, response)=>{
    const {tweetId}=request;
    const {payload}=request;
    const {user_id, name, username, gender}=payload;
    const selectUserQuery = `SELECT * FROM tweet WHERE tweet.user_id=${user_id} AND tweet.tweet_id=${tweetId};`;
  
    const tweetUser = await db.all(selectUserQuery);

    if(tweetUser.length!==0){
        const deleteTweetQuery=`
            DELETE FROM tweet
            WHERE 
                tweet.user_id=${user_id} AND tweet.tweet_id=${tweetId};`;
        await.db.run(deleteTweetQuery);
        response.send("Tweet Removed");
    }else{
        response.status(401);
        response.send("Invalid Request");
    }

});*/

module.exports = app;
