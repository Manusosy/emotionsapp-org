import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, BarChart3, TrendingUp } from 'lucide-react';

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Export</h2>
        <p className="text-gray-600">
          Generate reports for stakeholders and export platform data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-blue-600" />
              Executive Summary
            </CardTitle>
            <CardDescription>
              Comprehensive platform overview for investors and stakeholders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Generate Executive Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-green-600" />
              Financial Report
            </CardTitle>
            <CardDescription>
              Revenue, growth metrics, and financial projections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Generate Financial Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-purple-600" />
              User Analytics
            </CardTitle>
            <CardDescription>
              User engagement, retention, and demographic insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Generate User Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-orange-600" />
              Custom Report
            </CardTitle>
            <CardDescription>
              Build custom reports with specific metrics and date ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Create Custom Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>
            Previously generated reports and exports
          </CardDescription>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center text-gray-500">
          No reports generated yet
        </CardContent>
      </Card>
    </div>
  );
}
