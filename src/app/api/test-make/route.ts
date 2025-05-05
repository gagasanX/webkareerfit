export async function GET() {
    const makeWebhookUrl = "https://hook.eu2.make.com/0e9o8dt2o21q1peoam3mur10u4xe";
    const testData = {
      assessmentId: "test123",
      assessmentType: "ijrl",
      responses: {q1: "test response"},
      categories: ["careerGoalClarity", "qualificationGap"],
      callbackUrl: "https://my.kareerfit.com/api/webhook/ai-analysis",
      secret: "E7f9K2pL8dX3qA6rZ0tY5sW1vC4mB9nG8hJ7uT2pR5xV"
    };
  
    try {
      console.log("Sending test request to Make.com");
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
  
      const responseText = await response.text();
      return new Response(`Status: ${response.status}, Body: ${responseText}`);
    } catch (error) {
      console.error("Error:", error);
      return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }