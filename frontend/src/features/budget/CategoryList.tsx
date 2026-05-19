import { Card, CardContent, CardHeader, CardTitle, UserDisplay } from '../../shared/ui';

interface CategoryBalance {
  memberId: string;
  totalQuota: number;
  spent: number;
  remainingQuota: number;
  share: number;
  percentage: number;
  user?: {
    name: string | null;
    email: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  monthlyBudget: number;
  totalSpent: number;
  balances: CategoryBalance[];
}

interface CategoryListProps {
  categories: Category[];
  onSelectCategory?: (id: string) => void;
}

export function CategoryList({ categories, onSelectCategory }: CategoryListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Budget Categories</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelectCategory?.(category.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {category.icon && <span className="mr-2">{category.icon}</span>}
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Spent: €{category.totalSpent.toLocaleString()}</span>
                    <span>Budget: €{category.monthlyBudget.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.min((category.totalSpent / category.monthlyBudget) * 100, 100).toString()}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member Breakdown</p>
                  {category.balances.map((balance) => (
                    <div key={balance.memberId} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <UserDisplay user={balance.user} className="font-medium" />
                        <span className="text-muted-foreground">{balance.percentage}% share</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Spent: €{balance.spent.toLocaleString()}</span>
                        <span className={balance.remainingQuota < 0 ? 'text-destructive font-bold' : ''}>
                          {balance.remainingQuota < 0 ? 'Over by' : 'Left'}: €{Math.abs(balance.remainingQuota).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${balance.remainingQuota < 0 ? 'bg-destructive' : 'bg-primary/70'}`}
                          style={{ width: `${Math.min((balance.spent / balance.totalQuota) * 100, 100).toString()}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-muted-foreground col-span-full">No categories found. Create one to start tracking.</p>
        )}
      </div>
    </div>
  );
}
