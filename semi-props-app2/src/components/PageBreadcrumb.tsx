import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

interface PageBreadcrumbProps {
  section: string;
  sectionUrl?: string;
  page: string;
  vehicle?: string;
}

export function PageBreadcrumb({ section, sectionUrl, page, vehicle }: PageBreadcrumbProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {sectionUrl ? (
            <BreadcrumbLink asChild>
              <Link to={sectionUrl}>{section}</Link>
            </BreadcrumbLink>
          ) : (
            <span className="text-muted-foreground">{section}</span>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {vehicle ? (
            <BreadcrumbLink>{page}</BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{page}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {vehicle && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{vehicle}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
