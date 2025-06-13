import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Clock,
  HelpCircle,
  MessageSquare,
  Search,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Heart,
  Settings,
  User,
  ShieldCheck,
  MapPin,
  Headphones
} from "lucide-react";

// Contact information for help center
const contactInfo = {
  email: "support@emotionsapp.org",
  phone: "+250 786 468 892",
  officeHours: "Mon-Fri, 8am-6pm",
  emergencySupport: "24/7 Support",
  officeAddress: "Kigali Innovation City, Special Economic Zone, Kigali, Rwanda"
};

// FAQ data for help center
const faqs = [
  {
    question: "How do I track my mood?",
    answer: "You can track your mood by visiting the Mood Tracker page from your dashboard. Click on the mood that best represents how you're feeling and add optional notes about your day."
  },
  {
    question: "How do I schedule an appointment?",
    answer: "Navigate to the Appointments section from your dashboard. Click on 'Schedule New Appointment', select your preferred provider, date, and time slot."
  },
  {
    question: "How can I access my therapy resources?",
    answer: "All resources shared by your therapist are available in the Resources section. You can filter by type (articles, videos, etc.) and save items for later viewing."
  },
  {
    question: "How do I change my password?",
    answer: "Go to Settings in your dashboard, then select the 'Security' tab. Click on 'Change Password' and follow the instructions to set a new password."
  },
  {
    question: "What should I do in a mental health emergency?",
    answer: "If you're experiencing a mental health emergency, please call our 24/7 crisis line at +250 786 468 892 or contact your local emergency services by dialing 911."
  },
  {
    question: "Is my information kept confidential?",
    answer: "Yes, we take your privacy seriously. All your personal information and communications with therapists are encrypted and kept confidential according to our privacy policy and applicable laws."
  },
  {
    question: "Can I cancel or reschedule my appointment?",
    answer: "Yes, you can cancel or reschedule your appointment through your dashboard up to 24 hours before the scheduled time without any penalty. Go to Appointments and select the appointment you wish to modify."
  },
  {
    question: "How do I provide feedback about my therapy experience?",
    answer: "After each session, you'll receive a notification to rate your experience. Additionally, you can visit the Feedback section in your profile to share more detailed thoughts about your overall experience."
  }
];

// Quick links for help center
const quickLinks = [
  { title: "Mood Tracking", icon: Heart, href: "/patient-dashboard/mood-tracker", description: "Track and monitor your emotional wellbeing" },
  { title: "Appointments", icon: Calendar, href: "/patient-dashboard/appointments", description: "Schedule and manage your therapy sessions" },
  { title: "Resources", icon: BookOpen, href: "/patient-dashboard/resources", description: "Browse therapeutic resources and materials" },
  { title: "Journal", icon: FileText, href: "/patient-dashboard/journal", description: "Record your thoughts and feelings" },
  { title: "Profile", icon: User, href: "/patient-dashboard/profile", description: "Manage your personal information" },
  { title: "Settings", icon: Settings, href: "/patient-dashboard/settings", description: "Adjust your account preferences" }
];

// Categories for knowledge base
const knowledgeBase = [
  {
    title: "Getting Started",
    icon: <BookOpen className="h-5 w-5" />,
    articles: [
      "Creating your account",
      "Setting up your profile",
      "Navigating the dashboard",
      "Understanding your therapy plan"
    ]
  },
  {
    title: "Therapy Sessions",
    icon: <Users className="h-5 w-5" />,
    articles: [
      "Preparing for your first session",
      "What to expect in therapy",
      "Session etiquette",
      "Follow-up activities"
    ]
  },
  {
    title: "Technical Support",
    icon: <Settings className="h-5 w-5" />,
    articles: [
      "Troubleshooting connection issues",
      "Audio and video settings",
      "Browser compatibility",
      "Mobile app guidance"
    ]
  },
  {
    title: "Privacy & Security",
    icon: <ShieldCheck className="h-5 w-5" />,
    articles: [
      "Data protection measures",
      "Communication encryption",
      "Managing consent settings",
      "Understanding data rights"
    ]
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Search functionality will be available soon");
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Your message has been sent. We'll respond shortly.");
    setContactName("");
    setContactEmail("");
    setContactMessage("");
  };

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => 
    searchQuery === "" || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Help Center</h1>
            <p className="text-slate-500">
              Find answers, get support, and resolve issues
            </p>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search for help..."
              className="pl-10 pr-4 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
            <TabsTrigger value="knowledgeBase">Knowledge Base</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Quick Links Section */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Shortcuts to helpful resources in your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickLinks.map((link, index) => (
                    <Card key={index} className="hover:shadow-md transition cursor-pointer">
                      <CardContent className="p-4 flex items-start space-x-4">
                        <div className="bg-blue-50 p-2 rounded-md">
                          <link.icon className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <h3 className="font-medium">{link.title}</h3>
                          <p className="text-sm text-slate-500">{link.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular FAQs */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Common questions from our users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.slice(0, 4).map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => setActiveTab("faqs")}>
                    View All FAQs
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contact Support Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-500" />
                  Contact & Office Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      For patient support, technical issues, or emergencies, please use the same contact details below.
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center text-slate-600">
                        <Mail className="h-4 w-4 mr-3 text-slate-400" />
                        <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-500">
                          {contactInfo.email}
                        </a>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Phone className="h-4 w-4 mr-3 text-slate-400" />
                        <a href={`tel:${contactInfo.phone.replace(/\D/g, '')}`} className="hover:text-blue-500">
                          {contactInfo.phone}
                        </a>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Clock className="h-4 w-4 mr-3 text-slate-400" />
                        <span>Office Hours: {contactInfo.officeHours}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Headphones className="h-4 w-4 mr-3 text-slate-400" />
                        <span>Emergency: {contactInfo.emergencySupport}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Office Location */}
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Visit our office during business hours for in-person assistance.
                    </p>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-start text-slate-600">
                        <MapPin className="h-4 w-4 mr-3 text-slate-400 mt-1" />
                        <span>{contactInfo.officeAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQs Tab */}
          <TabsContent value="faqs" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2 text-blue-500" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>Find answers to common questions</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8">
                    <HelpCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                    <h3 className="text-lg font-medium mb-1">No results found</h3>
                    <p className="text-slate-500">
                      Try a different search term or browse all FAQs
                    </p>
                  </div>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFaqs.map((faq, index) => (
                      <AccordionItem key={index} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Support Tab */}
          <TabsContent value="contact" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Support Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-blue-500" />
                    Contact & Office Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600">
                    The same contact information is used for patient support, technical issues, and emergencies.
                  </p>
                  
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center text-slate-600">
                      <Mail className="h-4 w-4 mr-3 text-slate-400" />
                      <a href={`mailto:${contactInfo.email}`} className="hover:text-blue-500">
                        {contactInfo.email}
                      </a>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Phone className="h-4 w-4 mr-3 text-slate-400" />
                      <a href={`tel:${contactInfo.phone.replace(/\D/g, '')}`} className="hover:text-blue-500">
                        {contactInfo.phone}
                      </a>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Clock className="h-4 w-4 mr-3 text-slate-400" />
                      <span>Office Hours: {contactInfo.officeHours}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Headphones className="h-4 w-4 mr-3 text-slate-400" />
                      <span>Emergency: {contactInfo.emergencySupport}</span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mt-4">
                    Visit our office during business hours for in-person assistance.
                  </p>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start text-slate-600">
                      <MapPin className="h-4 w-4 mr-3 text-slate-400 mt-1" />
                      <span>{contactInfo.officeAddress}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                    Send Us a Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitContact} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name
                        </label>
                        <Input
                          id="name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="Your email address"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="How can we help you?"
                        rows={4}
                        required
                      />
                    </div>
                    <Button type="submit">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledgeBase" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {knowledgeBase.map((category, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center">
                      <div className="bg-blue-50 p-2 rounded-md mr-2">
                        {category.icon}
                      </div>
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article, i) => (
                        <li key={i} className="flex items-center">
                          <a 
                            href="#" 
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                            onClick={(e) => {
                              e.preventDefault();
                              toast("Article will be available soon");
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {article}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Badge variant="outline" className="text-xs">
                      {category.articles.length} Articles
                    </Badge>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 