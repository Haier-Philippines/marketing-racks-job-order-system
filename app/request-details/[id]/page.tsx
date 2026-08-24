'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RequestDetailsPage() {
  const { id } = useParams()
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new job order details page
    if (id) {
      router.replace(`/employee/my-requests/${id}`)
    }
  }, [id, router])

  return null
}
