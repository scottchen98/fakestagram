const { readFile, writeFile, rename, unlink } = require("fs").promises;
const path = require("path");

const moveFile = async (username, image) => {
  try {
    await rename(
      image.filepath,
      path.join(__dirname, "photos", `${username}`, image.originalFilename)
    );
  } catch (error) {
    console.log(error.message);
  }
};

const moveFiles = async (username, images) => {
  try {
    for (const image of images) {
      await rename(
        image.filepath,
        path.join(__dirname, "photos", `${username}`, image.originalFilename)
      );
    }
  } catch (error) {
    console.log(error.message);
  }
};

const returnParsedDatabase = async () => {
  try {
    const database = await readFile(
      path.join(process.cwd(), "database", "data.json"),
      {
        encoding: "utf-8",
      }
    );
    return JSON.parse(database);
  } catch (error) {
    console.log(error.message);
  }
};

const addImageAndUpdatePostNumber = (database, username, image) => {
  for (const user of database) {
    if (user.username === username) {
      if (!user.photos.includes(image.originalFilename)) {
        user.photos.push(image.originalFilename);
        user.stats.posts += 1;
      }
    }
  }
};

const addMultipleImageAndUpdatePostNumber = (database, username, images) => {
  for (const user of database) {
    if (user.username === username) {
      for (const image of images) {
        if (!user.photos.includes(image.originalFilename)) {
          user.photos.push(image.originalFilename);
          user.stats.posts += 1;
        }
      }
    }
  }
};

const updateDatabase = async (database) => {
  try {
    await writeFile(
      path.join(process.cwd(), "database", "data.json"),
      JSON.stringify(database)
    );
  } catch (error) {
    console.log(error.message);
  }
};

const removeFileFromDatabaseAndDecrementPostNumber = (
  database,
  username,
  index
) => {
  for (const user of database) {
    // Splice the image based on its index
    if (user.username === username) {
      user.photos.splice(index, 1);

      // Decrement the number of posts by 1
      user.stats.posts -= 1;
    }
  }
};

const waitForDatabaseToBeUpdated = async (username, fileName) => {
  try {
    const database = await returnParsedDatabase();
    for (const user of database) {
      if (user.username === username && user.photos.includes(fileName)) {
        const postsNum = user.stats.posts;
        const newImageIndex = user.photos.length - 1;
        return [postsNum, newImageIndex];
      }
    }
    return waitForDatabaseToBeUpdated(username, fileName);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  moveFile,
  moveFiles,
  returnParsedDatabase,
  addImageAndUpdatePostNumber,
  addMultipleImageAndUpdatePostNumber,
  updateDatabase,
  removeFileFromDatabaseAndDecrementPostNumber,
  waitForDatabaseToBeUpdated,
};
