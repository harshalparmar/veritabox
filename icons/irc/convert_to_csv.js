import fs from 'fs';

try {
  const jsonContent = fs.readFileSync('robo-ctf-questions.json', 'utf8');
  const questions = JSON.parse(jsonContent);
  
  const headers = ["roundNumber", "roundTitle", "questionText", "option1", "option2", "option3", "option4", "correctAnswer", "explanation", "points"];
  
  const rows = [
    headers,
    ...questions.map((q) => {
      // Extract roundNumber and title from "### [R1] Title" structure
      let roundNumber = 1;
      let roundTitle = "";
      
      const rMatch = q.questionText.match(/^###\s*\[R(\d+)\]\s*(.*?)\n/);
      if (rMatch) {
        roundNumber = parseInt(rMatch[1]) || 1;
        roundTitle = rMatch[2] || "";
      }
      
      return [
        roundNumber,
        roundTitle,
        q.questionText || "",
        q.options[0] || "",
        q.options[1] || "",
        q.options[2] || "",
        q.options[3] || "",
        q.correctAnswer || "",
        q.explanation || "",
        q.points || 10
      ];
    })
  ];
  
  // Format cells with quotes and escaped double-quotes
  const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  fs.writeFileSync('robo-ctf-questions.csv', csvContent, 'utf8');
  console.log("Conversion successful! Total questions mapped to CSV:", questions.length);
} catch (e) {
  console.error("Conversion failed:", e.message);
}
