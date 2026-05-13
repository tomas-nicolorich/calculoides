import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';

interface Category {
  id: string;
  name: string;
  icon?: string;
  monthlyBudget: number;
  spent: number;
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Spent: €{category.spent.toLocaleString()}</span>
                  <span>Budget: €{category.monthlyBudget.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min((category.spent / category.monthlyBudget) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  €{(category.monthlyBudget - category.spent).toLocaleString()} remaining
                </p>
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
