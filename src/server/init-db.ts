import { initialiseDatabase } from "./schema.js";

await initialiseDatabase();
console.log("CollegeCloud database is ready.");
