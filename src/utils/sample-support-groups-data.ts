import { supabase } from '@/lib/supabase'

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
  },
  {
    name: "Addiction Recovery Circle",
    description: "A supportive environment for individuals in recovery from addiction. We focus on sobriety maintenance, sharing experiences, and building a strong support network.",
    group_type: "addiction",
    meeting_type: "online",
    max_participants: 20,
    current_participants: 12,
    mentor_id: null,
    meeting_schedule: [
      { day: "Monday", time: "19:00" },
      { day: "Friday", time: "20:00" }
    ],
    group_rules: "1. Sobriety is the foundation\n2. What's shared here, stays here\n3. Support each other's recovery journey\n4. Celebrate milestones together\n5. Practice accountability with kindness",
    status: "active",
    is_public: true,
    meeting_link: "https://meet.google.com/recovery-circle",
    location: null
  },
  {
    name: "Trauma Healing Together",
    description: "A gentle space for trauma survivors to heal and grow together. We use evidence-based approaches and peer support to navigate the healing journey safely.",
    group_type: "trauma",
    meeting_type: "online",
    max_participants: 8,
    current_participants: 4,
    mentor_id: null,
    meeting_schedule: [
      { day: "Sunday", time: "16:00" }
    ],
    group_rules: "1. Trigger warnings are appreciated\n2. Respect personal boundaries\n3. Practice grounding techniques together\n4. Support without fixing\n5. Honor individual healing timelines",
    status: "active",
    is_public: true,
    meeting_link: "https://zoom.us/j/trauma-healing",
    location: null
  },
  {
    name: "Young Adults Mental Health",
    description: "Designed for young adults (18-25) navigating mental health challenges. We discuss stress management, life transitions, relationships, and building resilience.",
    group_type: "youth",
    meeting_type: "hybrid",
    max_participants: 15,
    current_participants: 9,
    mentor_id: null,
    meeting_schedule: [
      { day: "Saturday", time: "14:00" }
    ],
    group_rules: "1. Age-appropriate discussions only\n2. Respect diverse experiences\n3. Share coping strategies that work\n4. Build each other up\n5. Keep personal information private",
    status: "active",
    is_public: true,
    meeting_link: "https://meet.google.com/young-adults-mh",
    location: "Youth Center, Conference Room A"
  }
]

// Sample group sessions
const sampleGroupSessions = [
  {
    group_id: null, // Will be filled after groups are created
    title: "Weekly Check-in: Managing Anxiety",
    description: "Our regular weekly session where we check in with each other, share any challenges from the past week, and practice anxiety management techniques together.",
    scheduled_date: "2024-01-17",
    start_time: "19:00",
    end_time: "20:30",
    session_type: "regular",
    status: "completed",
    attendance_count: 7,
    required_resources: "Notebook for mindfulness exercises"
  },
  {
    group_id: null,
    title: "Mindfulness Workshop",
    description: "A special workshop focused on mindfulness techniques for anxiety management. We'll learn breathing exercises, body scan meditation, and grounding techniques.",
    scheduled_date: "2024-01-20",
    start_time: "10:00",
    end_time: "12:00",
    session_type: "workshop",
    status: "scheduled",
    attendance_count: 0,
    required_resources: "Comfortable seating, quiet environment"
  },
  {
    group_id: null,
    title: "Coping Strategies Sharing",
    description: "A session where group members share effective coping strategies they've discovered. We'll create a collective resource of techniques that work.",
    scheduled_date: "2024-01-16",
    start_time: "18:30",
    end_time: "20:00",
    session_type: "regular",
    status: "completed",
    attendance_count: 4,
    required_resources: "None"
  }
]

// Sample waiting list entries
const sampleWaitingList = [
  {
    group_id: null, // Will be filled after groups are created
    user_id: null, // Will be filled with actual user IDs
    personal_message: "I've been struggling with anxiety for the past year and would really appreciate the support of others who understand what I'm going through. I'm committed to regular attendance and participating in the group.",
    status: "pending",
    applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    group_id: null,
    user_id: null,
    personal_message: "Recently lost my job due to company downsizing and it's been really affecting my mental health. I think connecting with others in a similar situation would be helpful for my recovery.",
    status: "pending",
    applied_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  }
]

export async function insertSampleSupportGroupsData() {
  try {
    console.log('Starting to insert sample support groups data...')

    // First, get some mood mentors to assign as group leaders
    const { data: mentors, error: mentorsError } = await supabase
      .from('mood_mentors')
      .select('id')
      .limit(6)

    if (mentorsError) {
      console.error('Error fetching mentors:', mentorsError)
      // Continue without mentor assignment
    }

    // Insert support groups
    const groupsToInsert = sampleSupportGroups.map((group, index) => ({
      ...group,
      mentor_id: mentors && mentors[index] ? mentors[index].id : null
    }))

    const { data: insertedGroups, error: groupsError } = await supabase
      .from('support_groups')
      .insert(groupsToInsert)
      .select('id, name')

    if (groupsError) {
      console.error('Error inserting support groups:', groupsError)
      throw groupsError
    }

    console.log(`Successfully inserted ${insertedGroups.length} support groups`)

    // Insert sample sessions for each group
    if (insertedGroups && insertedGroups.length > 0) {
      const sessionsToInsert = []
      
      // Add sessions for anxiety group (first group)
      if (insertedGroups[0]) {
        sessionsToInsert.push({
          ...sampleGroupSessions[0],
          group_id: insertedGroups[0].id
        })
        sessionsToInsert.push({
          ...sampleGroupSessions[1],
          group_id: insertedGroups[0].id
        })
      }

      // Add session for depression group (second group)
      if (insertedGroups[1]) {
        sessionsToInsert.push({
          ...sampleGroupSessions[2],
          group_id: insertedGroups[1].id
        })
      }

      if (sessionsToInsert.length > 0) {
        const { error: sessionsError } = await supabase
          .from('group_sessions')
          .insert(sessionsToInsert)

        if (sessionsError) {
          console.error('Error inserting group sessions:', sessionsError)
        } else {
          console.log(`Successfully inserted ${sessionsToInsert.length} group sessions`)
        }
      }

      // Get some patient users for waiting list samples
      const { data: patients, error: patientsError } = await supabase
        .from('patient_profiles')
        .select('id')
        .limit(2)

      if (!patientsError && patients && patients.length > 0) {
        // Insert sample waiting list entries
        const waitingListToInsert = sampleWaitingList.map((entry, index) => ({
          ...entry,
          group_id: insertedGroups[index] ? insertedGroups[index].id : insertedGroups[0].id,
          user_id: patients[index] ? patients[index].id : patients[0].id
        }))

        const { error: waitingListError } = await supabase
          .from('group_waiting_list')
          .insert(waitingListToInsert)

        if (waitingListError) {
          console.error('Error inserting waiting list entries:', waitingListError)
        } else {
          console.log(`Successfully inserted ${waitingListToInsert.length} waiting list entries`)
        }
      }
    }

    console.log('Sample support groups data insertion completed successfully!')
    return { success: true, groups: insertedGroups }

  } catch (error) {
    console.error('Error inserting sample support groups data:', error)
    return { success: false, error }
  }
}

// Utility function to clean up sample data (for testing)
export async function cleanupSampleSupportGroupsData() {
  try {
    console.log('Cleaning up sample support groups data...')

    // Delete in correct order due to foreign key constraints
    await supabase.from('session_attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('group_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('group_waiting_list').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('group_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('support_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('Sample data cleanup completed')
    return { success: true }
  } catch (error) {
    console.error('Error cleaning up sample data:', error)
    return { success: false, error }
  }
}

// Function to add sample members to groups
export async function addSampleMembersToGroups() {
  try {
    console.log('Adding sample members to groups...')

    // Get existing groups and patients
    const { data: groups } = await supabase
      .from('support_groups')
      .select('id, name, current_participants, max_participants')
      .eq('status', 'active')

    const { data: patients } = await supabase
      .from('patient_profiles')
      .select('id')
      .limit(10)

    if (!groups || !patients || patients.length === 0) {
      console.log('No groups or patients found for adding members')
      return { success: false, message: 'No groups or patients available' }
    }

    const membersToInsert = []
    
    // Add 2-3 members to each group
    groups.forEach((group, groupIndex) => {
      const membersToAdd = Math.min(3, patients.length - groupIndex)
      
      for (let i = 0; i < membersToAdd; i++) {
        const patientIndex = (groupIndex * 3 + i) % patients.length
        membersToInsert.push({
          group_id: group.id,
          user_id: patients[patientIndex].id,
          status: 'active',
          joined_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
          notes: `Added as sample member for ${group.name}`
        })
      }
    })

    if (membersToInsert.length > 0) {
      const { error } = await supabase
        .from('group_members')
        .insert(membersToInsert)

      if (error) {
        console.error('Error adding sample members:', error)
        return { success: false, error }
      }

      console.log(`Successfully added ${membersToInsert.length} sample members to groups`)
    }

    return { success: true, membersAdded: membersToInsert.length }
  } catch (error) {
    console.error('Error adding sample members:', error)
    return { success: false, error }
  }
}

// Helper function to run all sample data insertion
export async function setupCompleteSampleData() {
  console.log('Setting up complete sample support groups data...')
  
  const groupsResult = await insertSampleSupportGroupsData()
  if (!groupsResult.success) {
    return groupsResult
  }

  // Wait a moment for database triggers to process
  await new Promise(resolve => setTimeout(resolve, 1000))

  const membersResult = await addSampleMembersToGroups()
  
  return {
    success: true,
    groups: groupsResult.groups,
    membersAdded: membersResult.success ? membersResult.membersAdded : 0
  }
} 