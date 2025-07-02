import { supabase } from './src/lib/supabase'

// Sample support groups data
const sampleSupportGroups = [
  {
    name: "Anxiety Support Circle",
    description: "A supportive community for individuals dealing with anxiety disorders. We focus on sharing coping strategies, mindfulness techniques, and peer support in a safe environment.",
    group_type: "anxiety",
    meeting_type: "online",
    max_participants: 15,
    current_participants: 8,
    mentor_id: null, // Will be set when mentors exist
    meeting_schedule: [
      { day: "Wednesday", time: "19:00" },
      { day: "Saturday", time: "10:00" }
    ],
    group_rules: "1. Respect confidentiality\n2. Be supportive and non-judgmental\n3. Share your experiences honestly\n4. Attend regularly if possible\n5. Follow group guidelines",
    status: "active",
    is_public: true,
    meeting_link: "https://meet.google.com/anxiety-support",
    location: null
  },
  {
    name: "Depression Recovery Group", 
    description: "Join others on the journey to recovery from depression. We provide a space for sharing experiences, learning new coping skills, and building connections with people who understand.",
    group_type: "depression",
    meeting_type: "hybrid",
    max_participants: 12,
    current_participants: 5,
    mentor_id: null,
    meeting_schedule: [
      { day: "Tuesday", time: "18:30" }
    ],
    group_rules: "1. Maintain confidentiality\n2. Practice active listening\n3. Share as much or as little as you feel comfortable\n4. Support others without giving advice unless asked\n5. Respect different perspectives",
    status: "active",
    is_public: true,
    meeting_link: "https://zoom.us/j/depression-recovery",
    location: "Community Center, Room 201"
  },
  {
    name: "Grief & Loss Support",
    description: "A compassionate space for those who have experienced loss. Whether recent or ongoing, we're here to support you through your grief journey with understanding and care.",
    group_type: "grief",
    meeting_type: "in-person",
    max_participants: 10,
    current_participants: 3,
    mentor_id: null,
    meeting_schedule: [
      { day: "Thursday", time: "17:00" }
    ],
    group_rules: "1. Honor all forms of loss\n2. Respect individual grief processes\n3. Share memories if comfortable\n4. Listen without judgment\n5. Maintain sacred space for emotions",
    status: "active",
    is_public: true,
    meeting_link: null,
    location: "Healing Center, Peace Room"
  }
]

export async function insertSampleSupportGroupsData() {
  try {
    console.log('Starting to insert sample support groups data...')

    const { data: insertedGroups, error: groupsError } = await supabase
      .from('support_groups')
      .insert(sampleSupportGroups)
      .select('id, name')

    if (groupsError) {
      console.error('Error inserting support groups:', groupsError)
      throw groupsError
    }

    console.log(`Successfully inserted ${insertedGroups.length} support groups`)
    return { success: true, groups: insertedGroups }

  } catch (error) {
    console.error('Error inserting sample support groups data:', error)
    return { success: false, error }
  }
} 