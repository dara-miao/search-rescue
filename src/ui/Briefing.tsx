import { useEffect, useState } from 'react'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'
import { unlockAudio } from '../run/audio'
import { useRun } from '../run/store'

const BEATS = [
  {
    title: 'Doheny is on fire.',
    body: null,
  },
  {
    title: 'Your job is the perimeter.',
    body: 'Drive to marked openings. Assess who is at the glass. Rescue who you can reach. They walk to staging.',
  },
  {
    title: 'Assess to size up who is at the glass.',
    body: 'Thermal shows heat at the glass. Count and condition stay hidden until you assess.',
  },
  {
    title: 'When a room vents, that opening dies.',
    body: 'Smoke comes first. Stay off the lip.',
  },
  {
    title: 'The interior is closed.',
    body: 'You stay on the lawn. The red ring is staging. Charge there if you limp.',
  },
] as const
