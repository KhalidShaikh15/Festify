
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { participantId }: SendConfirmationRequest = await req.json();
    
    if (!participantId) {
      throw new Error("Missing participant ID");
    }
    
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
      throw new Error(participantError?.message || "Participant not found");
    }
    
    // Format date for better readability
    const eventDate = new Date(participant.event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // In a real application, you would use a proper email service here
    // For now, we'll just log the email that would be sent
    console.log(`
      Sending confirmation email to: ${participant.email}
      Subject: Registration Confirmed for ${participant.event.title}
      
      Dear ${participant.name},
      
      Thank you for registering for ${participant.event.title}!
      
      Your registration details:
      - Name: ${participant.name}
      - Email: ${participant.email}
      - Mobile: ${participant.mobile_number || 'Not provided'}
      - Class: ${participant.class}
      - Department: ${participant.department}
      
      Event Details:
      - Event: ${participant.event.title}
      - Date: ${eventDate}
      - Time: ${participant.event.event_time}
      - Venue: Campus Auditorium
      
      Please arrive 15 minutes before the event starts. Don't forget to bring your ID card.
      
      If you have any questions, please contact us at events@example.com.
      
      We look forward to seeing you there!
      
      Best regards,
      Event Management Team
    `);
    
    // For real implementation, connect to an email service like Resend
    // For example:
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: "events@yourdomain.com",
    //   to: participant.email,
    //   subject: `Registration Confirmed for ${participant.event.title}`,
    //   html: `<p>Dear ${participant.name},</p>...`,
    // });
    
    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent (simulated)" }),
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
