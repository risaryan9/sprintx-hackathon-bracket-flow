import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  MapPin,
  Trophy,
  Banknote,
  X,
  Loader2,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { TournamentRegistrationModal } from "@/components/TournamentRegistrationModal";
import { getTournaments, getTournamentEntriesCount } from "@/services/tournaments";
import { Tournament } from "@/types/tournament";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateFilterOption = "all" | "upcoming" | "this_month" | "custom";

const sortOptions = [
  { value: "start_date-asc", label: "Start Date · Soonest" },
  { value: "start_date-desc", label: "Start Date · Latest" },
  { value: "prize_pool-desc", label: "Prize Pool · High to Low" },
  { value: "prize_pool-asc", label: "Prize Pool · Low to High" },
  { value: "registration_fee-asc", label: "Registration Fee · Low to High" },
  { value: "registration_fee-desc", label: "Registration Fee · High to Low" },
  { value: "name-asc", label: "Name · A → Z" },
  { value: "name-desc", label: "Name · Z → A" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const ITEMS_PER_PAGE = 6;

const getDateFilterLabel = (value: DateFilterOption, range?: DateRange) => {
  switch (value) {
    case "upcoming":
      return "Upcoming";
    case "this_month":
      return "This Month";
    case "custom":
      if (range?.from && range?.to) {
        return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()}`;
      }
      return "Custom Range";
    default:
      return "Any Date";
  }
};

const Tournaments = () => {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [prizeRange, setPrizeRange] = useState<[number, number] | null>(null);
  const [feeRange, setFeeRange] = useState<[number, number] | null>(null);
  const [sortBy, setSortBy] = useState(sortOptions[0].value);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registrationTournament, setRegistrationTournament] = useState<Tournament | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});

  const sportOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.sport))).sort(),
    [data]
  );
  const cityOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.city))).sort(),
    [data]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(data.map((item) => item.category))).sort(),
    [data]
  );

  const prizeBounds = useMemo(() => {
    if (!data.length) {
      return { min: 0, max: 100000 };
    }
    const values = data.map((item) => item.prize_pool || 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [data]);

  const feeBounds = useMemo(() => {
    if (!data.length) {
      return { min: 0, max: 1000 };
    }
    const values = data.map((item) => item.registration_fee || 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [data]);

  const activePrizeRange = prizeRange ?? [prizeBounds.min, prizeBounds.max];
  const activeFeeRange = feeRange ?? [feeBounds.min, feeBounds.max];

  const filterByDate = (tournament: Tournament) => {
    const now = new Date();
    const start = new Date(tournament.start_date);
    const end = new Date(tournament.end_date);

    if (dateFilter === "upcoming") {
      return start >= now;
    }

    if (dateFilter === "this_month") {
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    }

    if (dateFilter === "custom" && customDateRange?.from && customDateRange?.to) {
      return (
        (start >= customDateRange.from && start <= customDateRange.to) ||
        (end >= customDateRange.from && end <= customDateRange.to) ||
        (start <= customDateRange.from && end >= customDateRange.to)
      );
    }

    return true;
  };

  const filteredTournaments = useMemo(() => {
    const filtered = data.filter((tournament) => {
      if (
        selectedSports.length &&
        !selectedSports.includes(tournament.sport)
      ) {
        return false;
      }
      if (
        selectedCities.length &&
        !selectedCities.includes(tournament.city)
      ) {
        return false;
      }
      if (
        selectedCategories.length &&
        !selectedCategories.includes(tournament.category)
      ) {
        return false;
      }
      if (
        tournament.prize_pool < activePrizeRange[0] ||
        tournament.prize_pool > activePrizeRange[1]
      ) {
        return false;
      }
      if (
        tournament.registration_fee < activeFeeRange[0] ||
        tournament.registration_fee > activeFeeRange[1]
      ) {
        return false;
      }
      if (
        searchTerm &&
        !tournament.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (!filterByDate(tournament)) {
        return false;
      }
      return true;
    });

    return filtered;
  }, [
    data,
    selectedSports,
    selectedCities,
    selectedCategories,
    activePrizeRange,
    activeFeeRange,
    searchTerm,
    dateFilter,
    customDateRange,
  ]);

  const sortedTournaments = useMemo(() => {
    const [field, direction] = sortBy.split("-");
    const sorted = [...filteredTournaments].sort((a, b) => {
      if (field === "name") {
        return direction === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (field === "start_date") {
        return direction === "asc"
          ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
          : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }

      const aValue = (a as Record<string, number>)[field];
      const bValue = (b as Record<string, number>)[field];

      return direction === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [filteredTournaments, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedTournaments.length / ITEMS_PER_PAGE));
  const paginatedTournaments = sortedTournaments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const tournamentsToFetch = paginatedTournaments.filter(
      (tournament) => entryCounts[tournament.id] === undefined
    );

    if (tournamentsToFetch.length === 0) {
      return;
    }

    let isMounted = true;

    const fetchCounts = async () => {
      try {
        const results = await Promise.all(
          tournamentsToFetch.map(async (tournament) => {
            const count = await getTournamentEntriesCount(tournament.id);
            return [tournament.id, count] as const;
          })
        );

        if (!isMounted) return;

        setEntryCounts((prev) => {
          const updated = { ...prev };
          results.forEach(([id, count]) => {
            updated[id] = count;
          });
          return updated;
        });
      } catch (error) {
        console.error("Failed to load entry counts", error);
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [paginatedTournaments, entryCounts]);

  const getEntryCountForTournament = (tournamentId: string) =>
    entryCounts[tournamentId] ?? 0;

  const isTournamentAtCapacity = (tournament: Tournament) => {
    if (!tournament.max_entries || tournament.max_entries <= 0) {
      return false;
    }
    return getEntryCountForTournament(tournament.id) >= tournament.max_entries;
  };

  const handleRegistrationSuccess = (tournamentId: string, totalEntries: number) => {
    setEntryCounts((prev) => ({ ...prev, [tournamentId]: totalEntries }));
  };

  const openRegistrationModal = (tournament: Tournament) => {
    setRegistrationTournament(tournament);
    setIsRegistrationOpen(true);
  };

  const selectedEntriesCount = selectedTournament
    ? getEntryCountForTournament(selectedTournament.id)
    : 0;
  const selectedEntriesLabel =
    selectedTournament && selectedTournament.max_entries
      ? `${Math.min(selectedEntriesCount, selectedTournament.max_entries)} / ${selectedTournament.max_entries}`
      : `${selectedEntriesCount}`;
  const selectedTournamentFull = selectedTournament
    ? isTournamentAtCapacity(selectedTournament)
    : false;

  const resetFilters = () => {
    setSelectedSports([]);
    setSelectedCities([]);
    setSelectedCategories([]);
    setSearchTerm("");
    setDateFilter("all");
    setCustomDateRange(undefined);
    setPrizeRange(null);
    setFeeRange(null);
    setCurrentPage(1);
  };

  const toggleSelection = (value: string, setter: (values: string[]) => void, currentValues: string[]) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter((item) => item !== value));
    } else {
      setter([...currentValues, value]);
    }
    setCurrentPage(1);
  };

  const isDefaultPrizeRange =
    activePrizeRange[0] === prizeBounds.min &&
    activePrizeRange[1] === prizeBounds.max;
  const isDefaultFeeRange =
    activeFeeRange[0] === feeBounds.min && activeFeeRange[1] === feeBounds.max;

  const activeFilters = [
    ...selectedSports.map((sport) => ({
      label: `Sport: ${sport}`,
      onClear: () =>
        toggleSelection(sport, setSelectedSports, selectedSports),
    })),
    ...selectedCities.map((city) => ({
      label: `City: ${city}`,
      onClear: () => toggleSelection(city, setSelectedCities, selectedCities),
    })),
    ...selectedCategories.map((category) => ({
      label: `Category: ${category}`,
      onClear: () =>
        toggleSelection(category, setSelectedCategories, selectedCategories),
    })),
    !isDefaultPrizeRange && {
      label: `Prize: ${formatCurrency(activePrizeRange[0])} – ${formatCurrency(
        activePrizeRange[1]
      )}`,
      onClear: () => setPrizeRange(null),
    },
    !isDefaultFeeRange && {
      label: `Fee: ${formatCurrency(activeFeeRange[0])} – ${formatCurrency(
        activeFeeRange[1]
      )}`,
      onClear: () => setFeeRange(null),
    },
    dateFilter !== "all" && {
      label: `Date: ${getDateFilterLabel(dateFilter, customDateRange)}`,
      onClear: () => {
        setDateFilter("all");
        setCustomDateRange(undefined);
      },
    },
    searchTerm && {
      label: `Search: ${searchTerm}`,
      onClear: () => setSearchTerm(""),
    },
  ].filter(Boolean) as { label: string; onClear: () => void }[];

  const activeFilterCount = activeFilters.length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      <main className="pt-32 pb-20">
        <section className="container px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <p className="text-sm uppercase tracking-[0.35em] text-primary mb-3">
              India Tournament Finder
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold mb-4">
              Discover competitive events curated across India
            </h1>
            <p className="text-muted-foreground text-lg">
              Browse active tournaments across Indian cities, filter by host sport or prize pools in rupees,
              and lock in your next appearance with confidence.
            </p>
          </div>

          <div className="glass glass-hover rounded-2xl p-6 md:p-8 mb-10 border border-white/10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tournaments by name"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 bg-black/40 border-white/10"
                  />
                </div>
                <div className="lg:w-64">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-black/30 border-white/10"
                      >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        {sortOptions.find((option) => option.value === sortBy)?.label ??
                          "Sort By"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 bg-[#0E0E0E] border-white/10">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {sortOptions.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option.value}
                          checked={sortBy === option.value}
                          onCheckedChange={() => setSortBy(option.value)}
                        >
                          {option.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <FilterDropdown
                  label="Sport"
                  placeholder="All sports"
                  values={sportOptions}
                  selectedValues={selectedSports}
                  onToggle={(value) =>
                    toggleSelection(value, setSelectedSports, selectedSports)
                  }
                />
                <FilterDropdown
                  label="City"
                  placeholder="All cities"
                  values={cityOptions}
                  selectedValues={selectedCities}
                  onToggle={(value) =>
                    toggleSelection(value, setSelectedCities, selectedCities)
                  }
                />
                <FilterDropdown
                  label="Category"
                  placeholder="All categories"
                  values={categoryOptions}
                  selectedValues={selectedCategories}
                  onToggle={(value) =>
                    toggleSelection(value, setSelectedCategories, selectedCategories)
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "upcoming", "this_month"] as DateFilterOption[]).map(
                      (option) => (
                        <Button
                          key={option}
                          variant={dateFilter === option ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full border-white/10",
                            dateFilter === option
                              ? "button-gradient text-white border-none"
                              : "bg-black/30"
                          )}
                          onClick={() => {
                            setDateFilter(option);
                            if (option !== "custom") {
                              setCustomDateRange(undefined);
                            }
                            setCurrentPage(1);
                          }}
                        >
                          {getDateFilterLabel(option)}
                        </Button>
                      )
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={dateFilter === "custom" ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full border-white/10",
                            dateFilter === "custom"
                              ? "button-gradient text-white border-none"
                              : "bg-black/30"
                          )}
                          onClick={() => setDateFilter("custom")}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {customDateRange?.from && customDateRange?.to
                            ? `${format(customDateRange.from, "MMM d")} – ${format(
                                customDateRange.to,
                                "MMM d"
                              )}`
                            : "Custom range"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto bg-[#0E0E0E] border-white/10 p-0">
                        <Calendar
                          mode="range"
                          selected={customDateRange}
                          onSelect={(range) => {
                            setCustomDateRange(range);
                            setDateFilter("custom");
                            setCurrentPage(1);
                          }}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <RangeSlider
                  label="Prize Pool"
                  icon={<Trophy className="h-4 w-4 text-primary" />}
                  value={activePrizeRange}
                  bounds={prizeBounds}
                  onValueChange={(value) => {
                    setPrizeRange([value[0], value[1]]);
                    setCurrentPage(1);
                  }}
                  onReset={() => setPrizeRange(null)}
                  isDefault={isDefaultPrizeRange}
                />
                <RangeSlider
                  label="Registration Fee"
                  icon={<Banknote className="h-4 w-4 text-primary" />}
                  value={activeFeeRange}
                  bounds={feeBounds}
                  onValueChange={(value) => {
                    setFeeRange([value[0], value[1]]);
                    setCurrentPage(1);
                  }}
                  onReset={() => setFeeRange(null)}
                  isDefault={isDefaultFeeRange}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTournaments.length} tournaments ·{" "}
                    {activeFilterCount} active filter
                    {activeFilterCount === 1 ? "" : "s"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-white"
                    onClick={resetFilters}
                    disabled={activeFilterCount === 0}
                  >
                    Clear all filters
                  </Button>
                </div>
                {activeFilters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                      <Badge
                        key={filter.label}
                        variant="secondary"
                        className="flex items-center gap-2 bg-white/10 text-white rounded-full px-3 py-1"
                      >
                        {filter.label}
                        <button
                          type="button"
                          aria-label={`Remove ${filter.label}`}
                          className="text-xs"
                          onClick={filter.onClear}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}

          {isError && (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground mb-4">
                We couldn&apos;t load tournaments right now.
              </p>
              <Button onClick={() => window.location.reload()} className="button-gradient">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && (
            <>
              {paginatedTournaments.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xl font-semibold mb-3">
                    No tournaments found
                  </p>
                  <p className="text-muted-foreground mb-6">
                    Try a different combination of filters or reset everything.
                  </p>
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {paginatedTournaments.map((tournament) => {
                      const entryCount = getEntryCountForTournament(tournament.id);
                      const tournamentFull = isTournamentAtCapacity(tournament);
                      const entriesLabel = tournament.max_entries
                        ? `${Math.min(entryCount, tournament.max_entries)} / ${tournament.max_entries}`
                        : `${entryCount}`;
                      return (
                      <Card
                        key={tournament.id}
                        className="bg-[#0C0C0C] border-white/5 hover:border-primary/50 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                        onClick={() => setSelectedTournament(tournament)}
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={tournament.image_url}
                            alt={tournament.name}
                            className="object-cover w-full h-full hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                          <Badge className="absolute top-4 left-4 bg-black/70 text-white rounded-full px-3 py-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {tournament.city}
                          </Badge>
                          {tournamentFull && (
                            <Badge className="absolute top-4 right-4 bg-destructive text-white rounded-full px-3 py-1">
                              Full
                            </Badge>
                          )}
                        </div>
                        <CardHeader className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-xl">
                              {tournament.name}
                            </CardTitle>
                            <Badge variant="outline" className="rounded-full">
                              {tournament.sport}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {tournament.category} • {tournament.venue}
                          </p>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(tournament.start_date), "MMM d, yyyy")} –{" "}
                              {format(new Date(tournament.end_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl border border-white/5 p-3 bg-white/5">
                              <p className="text-muted-foreground text-xs mb-1">
                                Prize Pool
                              </p>
                              <p className="font-semibold">
                                {formatCurrency(tournament.prize_pool)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/5 p-3 bg-white/5">
                              <p className="text-muted-foreground text-xs mb-1">
                                Registration Fee
                              </p>
                              <p className="font-semibold">
                                {formatCurrency(tournament.registration_fee)}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/5 p-3 bg-white/5 col-span-2">
                              <p className="text-muted-foreground text-xs mb-1">
                                Entries
                              </p>
                              <p className="font-semibold">
                                {entriesLabel}
                                {tournament.max_entries ? "" : " registered"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="flex items-center justify-between border-t border-white/5 pt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Organized by
                            </p>
                            <p className="text-sm font-semibold">
                              {tournament.organizer_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="rounded-full"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedTournament(tournament);
                              }}
                            >
                              View details
                            </Button>
                            <Button
                              className="button-gradient rounded-full"
                              onClick={(event) => {
                                event.stopPropagation();
                                openRegistrationModal(tournament);
                              }}
                              disabled={tournamentFull}
                            >
                              {tournamentFull ? "Full" : "Register"}
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    )})}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-10">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                handlePageChange(Math.max(1, currentPage - 1));
                              }}
                              className={cn(
                                currentPage === 1 && "pointer-events-none opacity-40"
                              )}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, index) => {
                            const page = index + 1;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  isActive={page === currentPage}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    handlePageChange(page);
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                handlePageChange(Math.min(totalPages, currentPage + 1));
                              }}
                              className={cn(
                                currentPage === totalPages &&
                                  "pointer-events-none opacity-40"
                              )}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />

      <TournamentRegistrationModal
        tournament={registrationTournament}
        open={isRegistrationOpen}
        onOpenChange={(open) => {
          setIsRegistrationOpen(open);
          if (!open) {
            setRegistrationTournament(null);
          }
        }}
        currentEntriesCount={
          registrationTournament ? getEntryCountForTournament(registrationTournament.id) : 0
        }
        onRegistrationSuccess={handleRegistrationSuccess}
      />

      <Dialog
        open={!!selectedTournament}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTournament(null);
          }
        }}
      >
        {selectedTournament && (
          <DialogContent className="max-w-3xl bg-[#0C0C0C] border-white/10">
            <DialogHeader>
              <DialogTitle>{selectedTournament.name}</DialogTitle>
              <DialogDescription>
                {selectedTournament.category} · {selectedTournament.sport}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl overflow-hidden border border-white/5">
                <img
                  src={selectedTournament.image_url}
                  alt={selectedTournament.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Schedule
                  </p>
                  <p className="font-semibold">
                    {format(new Date(selectedTournament.start_date), "eeee, MMM d yyyy")} –{" "}
                    {format(new Date(selectedTournament.end_date), "eeee, MMM d yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Venue
                  </p>
                  <p className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selectedTournament.venue}, {selectedTournament.city}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailMetric
                    label="Prize Pool"
                    value={formatCurrency(selectedTournament.prize_pool)}
                  />
                  <DetailMetric
                    label="Registration Fee"
                    value={formatCurrency(selectedTournament.registration_fee)}
                  />
                  <DetailMetric
                    label="Entries"
                    value={selectedEntriesLabel}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Organizer
                  </p>
                  <p className="font-semibold">{selectedTournament.organizer_name}</p>
                  <p className="text-muted-foreground">{selectedTournament.organizer_email}</p>
                  <p className="text-muted-foreground">{selectedTournament.organizer_contact}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/10 bg-black/30"
                    onClick={() => {
                      setSelectedTournament(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    className={cn(
                      "flex-1 button-gradient",
                      selectedTournamentFull && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (!selectedTournamentFull && selectedTournament) {
                        setSelectedTournament(null);
                        openRegistrationModal(selectedTournament);
                      }
                    }}
                    disabled={selectedTournamentFull}
                  >
                    {selectedTournamentFull ? "Full" : "Register"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

type RangeSliderProps = {
  label: string;
  icon: React.ReactNode;
  value: [number, number];
  bounds: { min: number; max: number };
  onValueChange: (value: number[]) => void;
  onReset: () => void;
  isDefault: boolean;
};

const RangeSlider = ({
  label,
  icon,
  value,
  bounds,
  onValueChange,
  onReset,
  isDefault,
}: RangeSliderProps) => (
  <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>
      {!isDefault && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-white"
          onClick={onReset}
        >
          Reset
        </button>
      )}
    </div>
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{formatCurrency(value[0])}</span>
      <span>{formatCurrency(value[1])}</span>
    </div>
    <Slider
      value={value}
      min={bounds.min}
      max={Math.max(bounds.max, bounds.min + 1)}
      step={Math.max(1, Math.round((bounds.max - bounds.min) / 20))}
      onValueChange={onValueChange}
    />
  </div>
);

type FilterDropdownProps = {
  label: string;
  placeholder: string;
  values: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
};

const FilterDropdown = ({
  label,
  placeholder,
  values,
  selectedValues,
  onToggle,
}: FilterDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="justify-between bg-black/30 border-white/10"
      >
        <span className="text-left">
          <span className="block text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span className="text-sm">
            {selectedValues.length
              ? `${selectedValues.length} selected`
              : placeholder}
          </span>
        </span>
        <SlidersHorizontal className="h-4 w-4 opacity-50" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64 bg-[#0E0E0E] border-white/10 max-h-80 overflow-y-auto">
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {values.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-4">
          No options available
        </p>
      )}
      {values.map((value) => (
        <DropdownMenuCheckboxItem
          key={value}
          checked={selectedValues.includes(value)}
          onCheckedChange={() => onToggle(value)}
        >
          {value}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

type DetailMetricProps = {
  label: string;
  value: string;
};

const DetailMetric = ({ label, value }: DetailMetricProps) => (
  <div className="rounded-xl border border-white/5 p-3 bg-white/5">
    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
      {label}
    </p>
    <p className="font-semibold">{value}</p>
  </div>
);

export default Tournaments;

