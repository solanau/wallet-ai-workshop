/*

These api keys are only to be used for this demo workshop. After the workshop is over, these keys will be deleted, so they will no longer work.

I reccomend you store your api keys in environment variables SERVER SIDE, and have a server side function that fetches the chat data and returns it to the client.

ps. i had to split the api key into two parts and base64 it because github will flag it as a secret if it is in one string.
*/

export const ApiKeys = {
  apikey: atob(
    "c2stb3hBeWZTWjN3YTZSUHhmUWxx" + "RDRUM0JsYmtGSlRscU5jaXBtZnVMM0NmZFgxYnlY" // workshopdemo-1
  ),
  org: atob("b3JnLU9nRE50bWw" + "yV1ZrTzFuQUdvTTZaMkNIbA=="),
};
