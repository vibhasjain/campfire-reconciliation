import { Button } from "@/components/ui/button"
import { Chip } from "@/components/common/Chip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import SiteFrame from "./SiteFrame"
import { REFERENCES } from "./references"

export default function ReferencesPage() {
  return (
    <SiteFrame title="What I looked at">
      <nav aria-label="Software" className="mb-8 flex gap-2">
        {(["Campfire", "Rillet", "Numeric"] as const).map((software) => (
          <Button key={software} asChild variant="ghost" size="sm">
            <a href={`#${software.toLowerCase()}`}>{software}</a>
          </Button>
        ))}
      </nav>
      {(["Campfire", "Rillet", "Numeric"] as const).map((software) => (
        <section
          key={software}
          id={software.toLowerCase()}
          className="mb-12 scroll-mt-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-medium">{software}</h2>
            <Chip>
              {REFERENCES.filter((item) => item.software === software).length}
            </Chip>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[700px]:grid-cols-2">
            {REFERENCES.filter((item) => item.software === software).map(
              (item, index) => (
                <figure key={item.src} className="min-w-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        aria-label={`Enlarge ${item.title}`}
                        className="flex aspect-[16/10] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg border-hair border-line bg-surface p-2 outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <img
                          src={item.src}
                          alt={item.title}
                          width={item.width}
                          height={item.height}
                          loading={
                            software === "Campfire" && index < 2
                              ? "eager"
                              : "lazy"
                          }
                          fetchPriority={
                            software === "Campfire" && index < 2
                              ? "high"
                              : "auto"
                          }
                          decoding="async"
                          className="max-h-full w-full object-contain"
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="[--dialog-w:1400px]">
                      <DialogHeader>
                        <DialogTitle>{item.title}</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-auto px-3 pb-3">
                        <img
                          src={item.src}
                          alt={item.title}
                          width={item.width}
                          height={item.height}
                          loading="lazy"
                          decoding="async"
                          className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
                        />
                        <DialogDescription className="mt-3 text-xs">
                          {item.note}
                        </DialogDescription>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <figcaption className="mt-3">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-xs text-fg-3">{item.note}</p>
                  </figcaption>
                </figure>
              )
            )}
          </div>
        </section>
      ))}
    </SiteFrame>
  )
}
