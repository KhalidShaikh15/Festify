
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendConfirmationRequest {
  participantId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Resend with API key
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }
    const resend = new Resend(RESEND_API_KEY);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    console.log("Creating Supabase client with URL:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData = await req.json();
    console.log("Received request data:", requestData);
    
    const { participantId }: SendConfirmationRequest = requestData;
    
    if (!participantId) {
      throw new Error("Missing participant ID");
    }
    
    console.log("Fetching participant with ID:", participantId);
    
    // Get participant with event details
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select(`
        *,
        event:events(*)
      `)
      .eq("id", participantId)
      .single();
    
    if (participantError || !participant) {
      console.error("Error fetching participant:", participantError);
      throw new Error(participantError?.message || "Participant not found");
    }
    
    console.log("Participant data fetched successfully:", participant);
    
    // Format date for better readability
    const eventDate = new Date(participant.event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Prepare email HTML content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h1 style="color: #333; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 15px;">Registration Confirmed</h1>
        
        <div style="padding: 20px 0;">
          <p style="font-size: 16px;">Dear <strong>${participant.name}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.5;">Thank you for registering for <strong>${participant.event.title}</strong>!</p>
          
          <div style="background-color: #f7f7f7; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #4f46e5;">Your Registration Details</h2>
            <ul style="list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Name:</strong> ${participant.name}</li>
              <li style="margin-bottom: 8px;"><strong>Email:</strong> ${participant.email}</li>
              <li style="margin-bottom: 8px;"><strong>Mobile:</strong> ${participant.mobile_number || 'Not provided'}</li>
              <li style="margin-bottom: 8px;"><strong>Class:</strong> ${participant.class}</li>
              <li style="margin-bottom: 8px;"><strong>Department:</strong> ${participant.department}</li>
            </ul>
          </div>
          
          <div style="border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #4f46e5;">Event Details</h2>
            <ul style="list-style: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Event:</strong> ${participant.event.title}</li>
              <li style="margin-bottom: 8px;"><strong>Date:</strong> ${eventDate}</li>
              <li style="margin-bottom: 8px;"><strong>Time:</strong> ${participant.event.event_time}</li>
              <li style="margin-bottom: 8px;"><strong>Venue:</strong> Campus Auditorium</li>
            </ul>
          </div>
          
          <p style="font-size: 16px;">Please arrive 15 minutes before the event starts. Don't forget to bring your ID card.</p>
          
          <p style="font-size: 16px;">If you have any questions, please contact us at <a href="mailto:events@example.com" style="color: #4f46e5;">events@example.com</a>.</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>Event Management Team</p>
        </div>
      </div>
    `;
    
    console.log("Sending email to:", participant.email);
    
    // Send actual email using Resend
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      from: "Event Registration <onboarding@resend.dev>",
      to: [participant.email],
      subject: `Registration Confirmed for ${participant.event.title}`,
      html: emailHtml,
    });
    
    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send email: ${emailError}`);
    }
    
    console.log("Email sent successfully:", emailResponse);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Confirmation email sent successfully",
        details: emailResponse
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
