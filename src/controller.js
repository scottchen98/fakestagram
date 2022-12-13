const { parse } = require("url");
const { readFile, writeFile, rename, unlink } = require("fs").promises;
const { createReadStream } = require("fs");
const { DEFAULT_HEADER } = require("./util/util");
const path = require("path");
const qs = require("querystring");
const ejs = require("ejs");
const database = require("../database/data.json");
const formidable = require("formidable");
const {
  moveFile,
  moveFiles,
  returnParsedDatabase,
  addImageAndUpdatePostNumber,
  addMultipleImageAndUpdatePostNumber,
  updateDatabase,
  removeFileFromDatabaseAndDecrementPostNumber,
} = require("./helpers");

const controller = {
  getImg: (request, response) => {
    const fileType = {
      ".jpeg": "images/jpeg",
      ".png": "images/png",
    };

    const { url } = request;
    const { pathname } = parse(url, true);
    const mediaType = fileType[path.extname(pathname)];

    response.setHeader("Content-Type", mediaType);
    pathname.includes("instagram_logo")
      ? createReadStream(
          path.join(__dirname, "./views/instagram_logo.png")
        ).pipe(response)
      : createReadStream(path.join(__dirname, `${pathname}`)).pipe(response);
  },
  getHomePage: async (request, response) => {
    try {
      const html = await ejs.renderFile(
        path.join(process.cwd(), "src", "views", "home.ejs"),
        { usersList: database }
      );

      response.writeHead(200, DEFAULT_HEADER);
      response.end(html);

      // const content = await readFile(
      //   path.join(__dirname, "views", "test.html"),
      //   "utf8"
      // );
      // response.end(content);
    } catch (err) {
      console.error(err.message);
    }
  },
  getFormPage: (request, response) => {
    return response.end(`
    <h1>Hello world</h1> <style> h1 {color:red;}</style>
    <form action="/form" method="post">
    <input type="text" name="username"><br>
    <input type="text" name="password"><br>
    <input type="submit" value="Upload">
    </form>
    `);
  },
  sendFormData: (request, response) => {
    var body = "";

    request.on("data", function (data) {
      body += data;
    });

    request.on("end", function () {
      var post = qs.parse(body);
      console.log(post);
    });
  },
  getFeed: async (request, response) => {
    try {
      // console.log(request.url); try: http://localhost:3000/feed?username=john123
      const { url } = request;
      // parseQueryString set to true, which returns an object in the 'query' property
      // in this case, it's {username: '<username>'}
      const username = parse(url, true).query.username;

      // io.on("connection", (socket) => {
      //   console.log("We are connected");

      //   socket.on("message", (msg) => {
      //     console.log("message: " + msg);
      //   });
      // });

      for (const user of database) {
        if (user.username === username) {
          const html = await ejs.renderFile(
            path.join(process.cwd(), "src", "views", "feed.ejs"),
            { user: user }
          );

          response.writeHead(200, DEFAULT_HEADER);
          response.end(html);
        }
      }
    } catch (err) {
      console.error(err.message);
    }
  },

  deleteImage: async (request, response) => {
    try {
      const { url } = request;

      // url.parse() returns an URL object that has the 'query' property
      // and value of {info: 'joh123&pic2.png&1'} for example
      const info = parse(url, true).query.info.split("&");
      const [username, photoName, index] = info;

      // Delete the image located inside the user's folder
      await unlink(path.join(__dirname, "photos", username, photoName));

      // Delete the image filename in the database
      const database = await returnParsedDatabase();
      removeFileFromDatabaseAndDecrementPostNumber(database, username, index);

      // Write the updated database to the same filepath it was in
      updateDatabase(database);

      response.end(`
                <h1>Image deleted!</h1>
                <form action="/" method="GET">
                <button style="cursor: pointer;
                background-color: black;
                color: white;
                padding: 1rem;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease-in-out;
                opacity: 0.7;"type="submit">Back to Users page</button>
                </form>
                `);
    } catch (error) {
      console.log(error.message);
    }
  },
  uploadImages: (request, response) => {
    // Basic setup & configuration
    const uploadFolder = path.join(__dirname, "photos");
    const options = {
      multiples: true,
      keepExtensions: true,
      uploadDir: uploadFolder,
      filename(name, ext, part, form) {
        return `${name}${ext}`;
      },
    };

    const form = formidable(options);

    // Parsing
    form.parse(request, async (err, fields, files) => {
      try {
        if (err) {
          response.writeHead(err.httpCode || 400, {
            "Content-Type": "text/plain",
          });
          response.end(String(err));
          return;
        }

        //=========== Move image(s) to the user's folder & Update database ===================
        const database = await returnParsedDatabase();

        const username = fields.username;
        const images = files.userFile;
        const isSingleFile = !images.length;

        // The if bock will run if the user only uploads one photo
        if (isSingleFile) {
          moveFile(username, images);

          // Add the filename to the user's photos list and increment the number of posts by 1
          addImageAndUpdatePostNumber(database, username, images);
        } else {
          // Move multiple images filename to the user's folder
          moveFiles(username, images);

          // Add multiple filenames to the user's photos list and increment the number of posts by 1
          addMultipleImageAndUpdatePostNumber(database, username, images);
        }
        // Write the updated database to the same filepath it was in
        updateDatabase(database);

        // ===========================================================

        response.end(`
        <h1>Success!</h1>
        <form action="/" method="GET">
        <button style="cursor: pointer;
            background-color: black;
            color: white;
            padding: 1rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.3s ease-in-out;
            opacity: 0.7;" type="submit">Back to Users page</button>
        </form>
        `);
      } catch (error) {
        console.log(error.message);
      }
    });
  },
};

module.exports = controller;
