import { useAuth } from '@/hooks/useAuth'
import { useStableUserType } from '@/hooks/useStableUserType'
import { BannerContainer } from './BannerContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BannerTestPage() {
  const { user } = useAuth()
  const { userType, isStudent, isTeacher, loading } = useStableUserType()

  console.log('[BannerTestPage] User info:', { 
    user: user?.id, 
    userType, 
    isStudent, 
    isTeacher, 
    loading 
  })

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste de Banners - Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User ID:</strong> {user?.id || 'N/A'}
              </div>
              <div>
                <strong>User Type:</strong> {userType || 'N/A'}
              </div>
              <div>
                <strong>Is Student:</strong> {isStudent ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Is Teacher:</strong> {isTeacher ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banner Test - Header</CardTitle>
        </CardHeader>
        <CardContent>
          <BannerContainer 
            placement="header" 
            maxBanners={2} 
            showDismiss={true}
            className="mb-4"
          />
          <p className="text-muted-foreground">
            Se você é um estudante, banners devem aparecer acima.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banner Test - Between Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <BannerContainer 
            placement="between-sections" 
            maxBanners={1} 
            showDismiss={true}
            className="mb-4"
          />
          <p className="text-muted-foreground">
            Teste de banner entre seções.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}