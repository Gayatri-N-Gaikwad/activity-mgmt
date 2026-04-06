import { llmModel } from "../services/geminiService.js";


// ===============================
// 1️⃣ Suggest Activities
// ===============================
export const suggestActivities = async (req, res) => {

  try {

    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({
        message: "Topic is required"
      });
    }

    const prompt = `
You are an expert university teaching assistant.

A faculty wants to create a classroom activity.

Topic: ${topic}

Suggest 4 different classroom activity ideas.

Return ONLY JSON in this format:

{
 "activities":[
   "activity idea 1",
   "activity idea 2",
   "activity idea 3",
   "activity idea 4"
 ]
}

Do NOT include markdown or explanations.
`;

    const result = await llmModel.generateContent(prompt);

    const response = await result.response;

    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    res.status(200).json(parsed);

  } catch (error) {

    console.error("Suggest Activity Error:", error);

    res.status(500).json({
      message: "Error suggesting activities"
    });

  }

};



// ===============================
// 2️⃣ Activity Options
// ===============================
export const activityOptions = async (req, res) => {

  try {

    res.json({
      difficulty_levels: [
        "Easy",
        "Medium",
        "Hard"
      ],
      activity_formats: [
        "Group Discussion",
        "Quiz",
        "Flip Classroom",
        "Case Study",
        "Problem Solving"
      ]
    });

  } catch (error) {

    res.status(500).json({
      message: "Error fetching options"
    });

  }

};



// ===============================
// 3️⃣ Generate Final Activity
// ===============================
export const generateFinalActivity = async (req, res) => {

  try {

    const {
      topic,
      activityIdea,
      difficulty,
      activityFormat
    } = req.body;

    if (!topic || !activityIdea) {

      return res.status(400).json({
        message: "Topic and activityIdea are required"
      });

    }

    const prompt = `
You are an expert teaching assistant.

Create a classroom activity using the following details:

Topic: ${topic}
Activity Idea: ${activityIdea}
Difficulty Level: ${difficulty}
Activity Format: ${activityFormat}

Generate the following structured response:

1 activity_title
2 description
3 step_by_step_instructions
4 student_questions (4 questions)
5 marks_distribution (total 20 marks)

Return ONLY JSON in this structure:

{
 "activity_title":"",
 "description":"",
 "step_by_step_instructions":[
   {
    "step":1,
    "title":"",
    "details":""
   }
 ],
 "student_questions":[
   {
    "question_number":1,
    "question_text":""
   }
 ],
 "marks_distribution":{
   "total_marks":20,
   "breakdown":[
     {
      "criterion":"",
      "marks":5
     }
   ]
 }
}

Do NOT include markdown.
`;

    const result = await llmModel.generateContent(prompt);

    const response = await result.response;

    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    res.status(200).json(parsed);

  } catch (error) {

    console.error("Generate Activity Error:", error);

    res.status(500).json({
      message: "Error generating activity"
    });

  }

};