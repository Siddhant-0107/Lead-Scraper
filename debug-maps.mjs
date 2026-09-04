import mongoose from "mongoose";
import { scrapeGoogleMaps } from "./src/scraper/googleMapsScraper.js";
import { Job } from "./src/jobs/job.model.js";

await mongoose.connect("mongodb://localhost:27017/leadflow_test");

const jobId = "6a9a175ebfd4740542fa3678";

const leads = await scrapeGoogleMaps({
  business: "dentist",
  location: "Dhanbad, Jharkhand",
  maxResults: 5,

  isCancelled: async () =>
    (await Job.exists({
      _id: jobId,
      status: "cancelled"
    })) !== null,

  onProgress: async (progress, leadsFound) => {
    console.log("PROGRESS:", progress, "LEADS:", leadsFound);
  }
});

console.log("FINAL LEADS:", leads.length);
console.log(JSON.stringify(leads, null, 2));

await mongoose.disconnect();